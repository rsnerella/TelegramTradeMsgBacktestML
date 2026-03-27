"""
FastAPI Backend for Telegram Trading Signals Backtest System

This backend provides REST API endpoints for:
1. Parsing Telegram trading messages using regex NER
2. Storing signals in SQLite database
3. Running backtests with historical data
4. Serving statistics and metrics to React frontend

---
GETTING STARTED:

1. Get Telegram API Credentials:
   - Go to https://my.telegram.org/apps
   - Sign in with your phone number
   - Create a new application to get API_ID and API_HASH
   - Copy these values to your .env file

2. Create .env file with:
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   PHONE_NUMBER=your_phone_with_country_code

3. Install dependencies:
   pip install -r requirements.txt

4. Run the server:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

5. Connect Frontend:
   - Update API_BASE_URL in React dashboard to point to this server
   - For local dev: http://localhost:8000

---
API DOCUMENTATION:
Visit http://localhost:8000/docs for interactive API docs
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import or_, and_, func

from database import init_db, get_db, SessionLocal
from models import Signal, Channel, BacktestResult, RawMessage
from parser import parse_message
from telegram_client import (
    get_channel_by_username,
    fetch_messages_sync,
    get_user_channels
)
from backtest import (
from backtest import (
    BacktestEngine,
    run_single_backtest,
    run_all_backtest,
    get_backtest_summary,
    backtest_single_signal,
    backtest_open_signals,
    get_equity_data
)
from export_service import exporter


# Initialize FastAPI app
app = FastAPI(
    title="Telegram Trading Signals Backtest API",
    description="API for parsing, storing, and backtesting Telegram trading signals",
    version="1.0.0"
)

# CORS Configuration - Allow requests from React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class ChannelCreate(BaseModel):
    name: str = Field(..., description="Channel display name")
    username: Optional[str] = Field(None, description="Telegram username (with or without @)")
    telegram_id: Optional[int] = Field(None, description="Telegram channel ID")


class ChannelResponse(BaseModel):
    id: int
    name: str
    telegram_id: Optional[int]
    username: Optional[str]
    is_active: bool
    added_at: str
    signal_count: int


class SignalResponse(BaseModel):
    id: int
    channel_id: int
    channel_name: str
    raw_message: str
    stock: Optional[str]
    action: Optional[str]
    entry_price: Optional[float]
    target_price: Optional[float]
    sl_price: Optional[float]
    confidence: float
    status: str
    pnl: float
    points: float
    entry_time: Optional[str]
    exit_time: Optional[str]
    exit_price: Optional[float]
    exit_reason: Optional[str]
    created_at: str


class ParseRequest(BaseModel):
    message: str = Field(..., description="Raw Telegram message to parse")


class ParseResponse(BaseModel):
    raw_message: str
    stock: Optional[str]
    action: Optional[str]
    entry_price: Optional[float]
    target_price: Optional[float]
    sl_price: Optional[float]
    confidence: float
    entities: List[dict]
    has_signal: bool


class BacktestRequest(BaseModel):
    signal_id: Optional[int] = Field(None, description="Specific signal ID to backtest")
    status_filter: str = Field("OPEN", description="Filter signals by status (OPEN, ALL)")


class BacktestResponse(BaseModel):
    total_processed: int
    success_count: int
    failed_count: int
    total_pnl: float
    wins: int
    losses: int
    win_rate: float
    results: List[dict]


class SummaryStats(BaseModel):
    total_signals: int
    buy_signals: int
    sell_signals: int
    open_signals: int
    target_hit: int
    sl_hit: int
    total_pnl: float
    win_rate: float
    avg_pnl: float


class ChannelStats(BaseModel):
    channel_id: int
    channel_name: str
    signal_count: int
    total_pnl: float
    win_rate: float
    avg_pnl: float
    wins: int
    losses: int


# Startup event - initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("Database initialized successfully!")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Telegram Trading Signals Backtest API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# ==================== SIGNALS ENDPOINTS ====================

@app.get("/signals", response_model=List[SignalResponse])
async def get_signals(
    channel: Optional[str] = Query(None, description="Filter by channel name"),
    stock: Optional[str] = Query(None, description="Filter by stock symbol"),
    action: Optional[str] = Query(None, description="Filter by action (BUY/SELL)"),
    status: Optional[str] = Query(None, description="Filter by status (OPEN, TARGET_HIT, SL_HIT, EXPIRED)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: SessionLocal = Depends(get_db)
):
    """
    Get all parsed signals with optional filters
    """
    query = db.query(Signal)

    if channel:
        query = query.filter(Signal.channel_name.ilike(f"%{channel}%"))

    if stock:
        query = query.filter(Signal.stock.ilike(f"%{stock}%"))

    if action:
        query = query.filter(Signal.action == action.upper())

    if status:
        query = query.filter(Signal.status == status.upper())

    signals = query.order_by(Signal.created_at.desc()).offset(offset).limit(limit).all()

    return [SignalResponse(**s.to_dict()) for s in signals]


@app.get("/signals/{signal_id}", response_model=SignalResponse)
async def get_signal(signal_id: int, db: SessionLocal = Depends(get_db)):
    """
    Get a single signal by ID with full details
    """
    signal = db.query(Signal).filter(Signal.id == signal_id).first()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    return SignalResponse(**signal.to_dict(include_details=True))


@app.post("/signals/parse", response_model=ParseResponse)
async def parse_signal(request: ParseRequest):
    """
    Parse a Telegram message and extract trading entities
    Does not save to database - use /signals to get all signals
    """
    result = parse_message(request.message)
    return ParseResponse(**result)


@app.post("/signals/save")
async def save_signal(request: ParseRequest, db: SessionLocal = Depends(get_db)):
    """
    Parse and save a signal to the database
    """
    parsed = parse_message(request.message)

    if not parsed['has_signal']:
        raise HTTPException(
            status_code=400,
            detail="Message does not contain a valid trading signal"
        )

    # Check if signal already exists
    existing = db.query(Signal).filter(
        Signal.raw_message == request.message
    ).first()

    if existing:
        return {"message": "Signal already exists", "id": existing.id}

    # Create new signal
    signal = Signal(
        raw_message=request.message,
        channel_name="Manual",
        stock=parsed['stock'],
        action=parsed['action'],
        entry_price=parsed['entry_price'],
        target_price=parsed['target_price'],
        sl_price=parsed['sl_price'],
        confidence=parsed['confidence'],
        status='OPEN',
        entry_time=datetime.utcnow()
    )

    db.add(signal)
    db.commit()
    db.refresh(signal)

    return {"message": "Signal saved successfully", "id": signal.id}


# ==================== CHANNELS ENDPOINTS ====================

@app.get("/channels", response_model=List[ChannelResponse])
async def get_channels(db: SessionLocal = Depends(get_db)):
    """
    Get all monitored channels
    """
    channels = db.query(Channel).all()
    return [ChannelResponse(**c.to_dict()) for c in channels]


@app.post("/channels", response_model=ChannelResponse)
async def add_channel(channel: ChannelCreate, db: SessionLocal = Depends(get_db)):
    """
    Add a new channel to monitor
    """
    # Check if channel already exists
    existing = db.query(Channel).filter(Channel.name == channel.name).first()

    if existing:
        raise HTTPException(status_code=400, detail="Channel already exists")

    # Try to fetch telegram info if username provided
    telegram_id = channel.telegram_id
    username = channel.username

    if channel.username and not channel.telegram_id:
        import asyncio
        try:
            telegram_info = asyncio.run(get_channel_by_username(channel.username))
            if telegram_info:
                telegram_id = telegram_info['id']
                if not username:
                    username = telegram_info['username']
        except Exception as e:
            print(f"Could not fetch Telegram info: {e}")

    new_channel = Channel(
        name=channel.name,
        telegram_id=telegram_id,
        username=username,
        is_active=True
    )

    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)

    return ChannelResponse(**new_channel.to_dict())


@app.post("/channels/{channel_id}/sync")
async def sync_channel(channel_id: int, db: SessionLocal = Depends(get_db)):
    """
    Sync messages from Telegram channel and parse them into signals
    """
    channel = db.query(Channel).filter(Channel.id == channel_id).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if not channel.username:
        raise HTTPException(status_code=400, detail="Channel has no username for syncing")

    try:
        # Fetch messages from Telegram
        messages = fetch_messages_sync(
            channel_username=channel.username,
            limit=100,
            offset_hours=24
        )

        signals_created = 0

        for msg in messages:
            # Store raw message
            raw_msg = RawMessage(
                channel_id=channel.id,
                message_id=msg['id'],
                sender_id=msg.get('sender_id'),
                raw_text=msg['text'],
                message_date=msg['date'],
                has_media=msg['has_media'],
                media_type=msg.get('media_type'),
                is_parsed=False
            )
            db.add(raw_msg)

            # Parse the message
            parsed = parse_message(msg['text'])

            if parsed['has_signal']:
                # Check if signal already exists
                existing = db.query(Signal).filter(
                    Signal.message_id == msg['id'],
                    Signal.channel_id == channel.id
                ).first()

                if not existing:
                    signal = Signal(
                        channel_id=channel.id,
                        channel_name=channel.name,
                        raw_message=msg['text'],
                        message_id=msg['id'],
                        message_date=msg['date'],
                        stock=parsed['stock'],
                        action=parsed['action'],
                        entry_price=parsed['entry_price'],
                        target_price=parsed['target_price'],
                        sl_price=parsed['sl_price'],
                        confidence=parsed['confidence'],
                        status='OPEN',
                        entry_time=msg['date'] or datetime.utcnow()
                    )
                    db.add(signal)
                    signals_created += 1

        # Update channel last fetched time
        channel.last_fetched_at = datetime.utcnow()

        db.commit()

        return {
            "message": "Channel synced successfully",
            "messages_fetched": len(messages),
            "signals_created": signals_created
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ==================== STATS ENDPOINTS ====================

@app.get("/stats/summary", response_model=SummaryStats)
async def get_summary_stats(db: SessionLocal = Depends(get_db)):
    """
    Get overall summary statistics
    """
    total_signals = db.query(Signal).count()

    buy_signals = db.query(Signal).filter(Signal.action == 'BUY').count()
    sell_signals = db.query(Signal).filter(Signal.action == 'SELL').count()

    open_signals = db.query(Signal).filter(Signal.status == 'OPEN').count()
    target_hit = db.query(Signal).filter(Signal.status == 'TARGET_HIT').count()
    sl_hit = db.query(Signal).filter(Signal.status == 'SL_HIT').count()

    # P&L calculations
    pnl_result = db.query(
        func.sum(Signal.pnl).label('total_pnl'),
        func.count(Signal.id).label('count')
    ).filter(
        Signal.status.in_(['TARGET_HIT', 'SL_HIT', 'EXPIRED'])
    ).first()

    total_pnl = float(pnl_result.total_pnl or 0.0)
    completed_count = pnl_result.count or 0

    wins = db.query(Signal).filter(
        Signal.pnl > 0,
        Signal.status.in_(['TARGET_HIT', 'SL_HIT', 'EXPIRED'])
    ).count()

    win_rate = round((wins / completed_count * 100) if completed_count > 0 else 0, 2)
    avg_pnl = round(total_pnl / completed_count, 2) if completed_count > 0 else 0.0

    return SummaryStats(
        total_signals=total_signals,
        buy_signals=buy_signals,
        sell_signals=sell_signals,
        open_signals=open_signals,
        target_hit=target_hit,
        sl_hit=sl_hit,
        total_pnl=round(total_pnl, 2),
        win_rate=win_rate,
        avg_pnl=avg_pnl
    )


@app.get("/stats/equity")
async def get_equity_curve(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch"),
    db: SessionLocal = Depends(get_db)
):
    """
    Get daily P&L data for equity curve chart
    """
    equity_data = get_equity_data(days=days)

    return {
        "data": equity_data,
        "days": days
    }


@app.get("/stats/channels", response_model=List[ChannelStats])
async def get_channel_stats(db: SessionLocal = Depends(get_db)):
    """
    Get performance statistics per channel
    """
    channels = db.query(Channel).all()

    stats = []

    for channel in channels:
        signals = db.query(Signal).filter(Signal.channel_id == channel.id).all()

        if not signals:
            continue

        count = len(signals)
        wins = sum(1 for s in signals if s.pnl and s.pnl > 0 and s.status != 'OPEN')
        losses = sum(1 for s in signals if s.pnl and s.pnl <= 0 and s.status != 'OPEN')

        total_pnl = sum(s.pnl or 0 for s in signals)
        completed = sum(1 for s in signals if s.status != 'OPEN')
        avg_pnl = total_pnl / completed if completed > 0 else 0.0
        win_rate = (wins / completed * 100) if completed > 0 else 0.0

        stats.append(ChannelStats(
            channel_id=channel.id,
            channel_name=channel.name,
            signal_count=count,
            total_pnl=round(total_pnl, 2),
            win_rate=round(win_rate, 2),
            avg_pnl=round(avg_pnl, 2),
            wins=wins,
            losses=losses
        ))

    return stats


# ==================== BACKTEST ENDPOINTS ====================

@app.post("/backtest/run", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    Run backtest for specified signals
    """
    try:
        if request.signal_id:
            # Backtest single signal
            result = backtest_single_signal(request.signal_id)

            if not result:
                raise HTTPException(status_code=404, detail="Signal not found")

            if 'error' in result:
                raise HTTPException(status_code=400, detail=result['error'])

            return BacktestResponse(
                total_processed=1,
                success_count=1 if result else 0,
                failed_count=0 if result else 1,
                total_pnl=result.get('pnl', 0.0),
                wins=1 if result.get('pnl', 0.0) > 0 else 0,
                losses=1 if result.get('pnl', 0.0) <= 0 else 0,
                win_rate=100 if result.get('pnl', 0.0) > 0 else 0,
                results=[result] if result else []
            )

        else:
            # Backtest all signals with status filter
            backtest_data = backtest_open_signals()

            return BacktestResponse(
                total_processed=backtest_data['total_processed'],
                success_count=backtest_data['success_count'],
                failed_count=backtest_data['failed_count'],
                total_pnl=backtest_data['total_pnl'],
                wins=backtest_data['wins'],
                losses=backtest_data['losses'],
                win_rate=backtest_data['win_rate'],
                results=backtest_data['results']
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@app.post("/backtest/run-all")
async def run_backtest_all():
    """Run backtest for all open signals"""
    try:
        return run_all_backtest()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@app.post("/backtest/run/{id}")
async def run_backtest_single(id: int):
    """Run backtest for single signal"""
    try:
        return run_single_backtest(id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@app.get("/backtest/results")
async def get_backtest_results(db: SessionLocal = Depends(get_db)):
    """Get all completed backtest results with details"""
    # Fetch signals that have a backtest result
    signals = db.query(Signal).filter(Signal.status.in_(['TARGET_HIT', 'SL_HIT', 'EXPIRED'])).order_by(Signal.exit_time.desc()).all()
    results = []
    for s in signals:
        results.append({
            "stock": s.stock,
            "action": s.action,
            "entry": s.entry_price,
            "exit": s.exit_price,
            "pnl": s.pnl,
            "exit_reason": s.exit_reason,
            "days_held": (s.exit_time - s.entry_time).days if s.exit_time and s.entry_time else 0,
            "status": s.status,
            "entry_time": s.entry_time,
            "exit_time": s.exit_time
        })
    return results

@app.get("/backtest/summary")
async def get_summary_metrics():
    """Get advanced backtest metrics"""
    return get_backtest_summary()

@app.get("/backtest/best-stocks")
async def get_best_stocks(db: SessionLocal = Depends(get_db)):
    """Top 5 performing stocks"""
    signals = db.query(Signal).filter(Signal.status.in_(['TARGET_HIT', 'SL_HIT', 'EXPIRED'])).all()
    stock_pnl = {}
    for s in signals:
        if s.stock:
            stock_pnl[s.stock] = stock_pnl.get(s.stock, 0) + (s.pnl or 0)
    
    sorted_stocks = sorted(stock_pnl.items(), key=lambda x: x[1], reverse=True)
    return [{"stock": k, "pnl": round(v, 2)} for k, v in sorted_stocks[:5]]

@app.get("/backtest/worst-stocks")
async def get_worst_stocks(db: SessionLocal = Depends(get_db)):
    """Bottom 5 performing stocks"""
    signals = db.query(Signal).filter(Signal.status.in_(['TARGET_HIT', 'SL_HIT', 'EXPIRED'])).all()
    stock_pnl = {}
    for s in signals:
        if s.stock:
            stock_pnl[s.stock] = stock_pnl.get(s.stock, 0) + (s.pnl or 0)
    
    sorted_stocks = sorted(stock_pnl.items(), key=lambda x: x[1])
    return [{"stock": k, "pnl": round(v, 2)} for k, v in sorted_stocks[:5]]


@app.get("/backtest/export/csv")
async def export_backtest_csv(db: SessionLocal = Depends(get_db)):
    """Export all backtest results as a CSV file"""
    csv_data = exporter.generate_backtest_csv(db)
    
    from fastapi.responses import StreamingResponse
    import io
    
    stream = io.StringIO(csv_data)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=benchmark_results.csv"
    return response

# ==================== RAW MESSAGES ENDPOINTS ====================

@app.get("/messages/raw")
async def get_raw_messages(
    channel_id: Optional[int] = Query(None, description="Filter by channel ID"),
    unparsed_only: bool = Query(False, description="Only return unparsed messages"),
    limit: int = Query(100, ge=1, le=1000),
    db: SessionLocal = Depends(get_db)
):
    """
    Get raw unparsed Telegram messages
    """
    query = db.query(RawMessage)

    if channel_id:
        query = query.filter(RawMessage.channel_id == channel_id)

    if unparsed_only:
        query = query.filter(RawMessage.is_parsed == False)

    messages = query.order_by(RawMessage.message_date.desc()).limit(limit).all()

    return [m.to_dict() for m in messages]


# ==================== ROOT ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Telegram Trading Signals Backtest API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "signals": "/signals",
            "channels": "/channels",
            "stats": "/stats/summary",
            "equity": "/stats/equity",
            "backtest": "/backtest/run"
        }
    }


if __name__ == "__main__":
    import uvicorn

    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║   Telegram Trading Signals Backtest API                    ║
    ╠════════════════════════════════════════════════════════════╣
    ║   API Documentation: http://localhost:8000/docs            ║
    ║   Health Check:     http://localhost:8000/health           ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
