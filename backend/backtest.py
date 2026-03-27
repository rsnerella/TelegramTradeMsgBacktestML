"""
Backtest Engine - Calculate P&L for trading signals using historical OHLC data
Uses yfinance for fetching 1-minute historical price data and evaluates signals candle by candle
"""
import yfinance as yf
import pandas as pd
import numpy as np
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import math
from models import Signal, BacktestResult, Channel
from database import SessionLocal

# Configure backtest logger
logger = logging.getLogger("backtest")
logger.setLevel(logging.INFO)
file_handler = logging.FileHandler("backtest_errors.log")
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

def get_yahoo_ticker(stock_name: str) -> str:
    """
    Converts NSE stock name to Yahoo Finance ticker.
    Supports top 50 NSE stocks and indices.
    """
    if not stock_name:
        return ""
    
    stock_name = stock_name.upper().strip()
    
    mapping = {
        'NIFTY50': '^NSEI',
        'NIFTY': '^NSEI',
        'BANKNIFTY': '^NSEBANK',
        'FINNIFTY': '^CNXFIN',
        'MIDCPNIFTY': '^CRSMID',
        'SENSEX': '^BSESN',
        
        # Top 50 NSE Stocks
        'RELIANCE': 'RELIANCE.NS',
        'TCS': 'TCS.NS',
        'HDFCBANK': 'HDFCBANK.NS',
        'ICICIBANK': 'ICICIBANK.NS',
        'BHARTIARTL': 'BHARTIARTL.NS',
        'SBIN': 'SBIN.NS',
        'INFY': 'INFY.NS',
        'LICI': 'LICI.NS',
        'ITC': 'ITC.NS',
        'HINDUNILVR': 'HINDUNILVR.NS',
        'LT': 'LT.NS',
        'BAJFINANCE': 'BAJFINANCE.NS',
        'HCLTECH': 'HCLTECH.NS',
        'MARUTI': 'MARUTI.NS',
        'SUNPHARMA': 'SUNPHARMA.NS',
        'TATAMOTORS': 'TATAMOTORS.NS',
        'TCS': 'TCS.NS',
        'KOTAKBANK': 'KOTAKBANK.NS',
        'AXISBANK': 'AXISBANK.NS',
        'NTPC': 'NTPC.NS',
        'ONGC': 'ONGC.NS',
        'POWERGRID': 'POWERGRID.NS',
        'ASIANPAINT': 'ASIANPAINT.NS',
        'BAJAJFINSV': 'BAJAJFINSV.NS',
        'COALINDIA': 'COALINDIA.NS',
        'TITAN': 'TITAN.NS',
        'ADANIENT': 'ADANIENT.NS',
        'ADANIPORTS': 'ADANIPORTS.NS',
        'TATASTEEL': 'TATASTEEL.NS',
        'WIPRO': 'WIPRO.NS',
        'HDFCLIFE': 'HDFCLIFE.NS',
        'TECHM': 'TECHM.NS',
        'GRASIM': 'GRASIM.NS',
        'HINDALCO': 'HINDALCO.NS',
        'SBILIFE': 'SBILIFE.NS',
        'ULTRACEMCO': 'ULTRACEMCO.NS',
        'DRREDDY': 'DRREDDY.NS',
        'EICHERMOT': 'EICHERMOT.NS',
        'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
        'DIVISLAB': 'DIVISLAB.NS',
        'INDUSINDBK': 'INDUSINDBK.NS',
        'APOLLOHOSP': 'APOLLOHOSP.NS',
        'BRITANNIA': 'BRITANNIA.NS',
        'CIPLA': 'CIPLA.NS',
        'TATACONSUM': 'TATACONSUM.NS',
        'HEROMOTOCO': 'HEROMOTOCO.NS',
        'NESTLEIND': 'NESTLEIND.NS',
        'UPL': 'UPL.NS',
        'M&M': 'M&M.NS',
        'BPCL': 'BPCL.NS'
    }
    
    if stock_name in mapping:
        return mapping[stock_name]
        
    if '.' in stock_name:
        return stock_name
        
    return f"{stock_name}.NS"


def fetch_ohlc(ticker: str, start_date: datetime, end_date: datetime) -> pd.DataFrame:
    """
    Fetches 1-minute OHLC data using yfinance.
    """
    try:
        time.sleep(0.5)  # Rate limiting
        df = yf.download(ticker, start=start_date, end=end_date, interval="1m", progress=False)
        return df
    except Exception as e:
        logger.error(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()


def run_single_backtest(signal_id: int) -> dict:
    """
    Runs backtest for one signal candle by candle.
    """
    db = SessionLocal()
    try:
        signal = db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            return {"error": "Signal not found"}

        current_time = datetime.utcnow()
        if current_time - signal.entry_time < timedelta(days=1):
            signal.status = "TOO_RECENT"
            db.commit()
            return {"status": "TOO_RECENT", "signal_id": signal_id}

        ticker = get_yahoo_ticker(signal.stock)
        
        # 5 trading days max holding period -> ~7 calendar days
        end_date = signal.entry_time + timedelta(days=7)
        if end_date > current_time:
            end_date = current_time

        df = fetch_ohlc(ticker, signal.entry_time, end_date)
        
        if df.empty:
            signal.status = "DATA_NOT_FOUND"
            logger.error(f"DATA_NOT_FOUND for ticker {ticker} on signal {signal_id}")
            db.commit()
            return {"status": "DATA_NOT_FOUND", "signal_id": signal_id}

        # Filter candles after entry time exactly
        # Note: yfinance indices are timezone aware if localized, otherwise naive
        df.index = df.index.tz_localize(None)
        df = df[df.index >= signal.entry_time]

        if df.empty:
            signal.status = "DATA_NOT_FOUND"
            logger.error(f"NO_CANDLES_AFTER_ENTRY for ticker {ticker} on signal {signal_id}")
            db.commit()
            return {"status": "DATA_NOT_FOUND", "signal_id": signal_id}

        status = "OPEN"
        pnl = 0.0
        exit_price = 0.0
        exit_time = None
        exit_reason = None
        
        entry = signal.entry_price or df.iloc[0]['Open'].item()

        for idx, row in df.iterrows():
            high = row['High'].item()
            low = row['Low'].item()
            
            if signal.action == "BUY":
                if signal.target_price and high >= signal.target_price:
                    status = "TARGET_HIT"
                    exit_price = signal.target_price
                    pnl = exit_price - entry
                    exit_time = idx
                    exit_reason = "TARGET"
                    break
                elif signal.sl_price and low <= signal.sl_price:
                    status = "SL_HIT"
                    exit_price = signal.sl_price
                    pnl = exit_price - entry
                    exit_time = idx
                    exit_reason = "SL"
                    break
                    
            elif signal.action == "SELL":
                if signal.target_price and low <= signal.target_price:
                    status = "TARGET_HIT"
                    exit_price = signal.target_price
                    pnl = entry - exit_price
                    exit_time = idx
                    exit_reason = "TARGET"
                    break
                elif signal.sl_price and high >= signal.sl_price:
                    status = "SL_HIT"
                    exit_price = signal.sl_price
                    pnl = entry - exit_price
                    exit_time = idx
                    exit_reason = "SL"
                    break

        if status == "OPEN":
            # Neither hit within the available data => EXPIRED if > 5 trading days
            # Just take the last available close as expired to match requirement
            status = "EXPIRED"
            last_idx = df.index[-1]
            exit_price = df.iloc[-1]['Close'].item()
            if signal.action == "BUY":
                pnl = exit_price - entry
            else:
                pnl = entry - exit_price
            exit_time = last_idx
            exit_reason = "EXPIRED"

        # Safe calculate holding days
        holding_days = (exit_time - signal.entry_time).days
        if holding_days < 0:
            holding_days = 0

        # Update Signal
        signal.status = status
        signal.pnl = pnl
        signal.exit_price = exit_price
        signal.exit_time = exit_time
        signal.exit_reason = exit_reason
        
        # Save BacktestResult
        existing_bt = db.query(BacktestResult).filter(BacktestResult.signal_id == signal.id).first()
        if existing_bt:
            db.delete(existing_bt)
            
        bt_result = BacktestResult(
            signal_id=signal.id,
            actual_entry_date=signal.entry_time,
            actual_exit_date=exit_time,
            actual_entry_price=entry,
            actual_exit_price=exit_price,
            pnl=pnl,
            holding_days=holding_days,
            exit_reason=exit_reason,
            max_drawdown=0.0 # Standard drawdown requires full equity curve, simplified here to 0
        )
        db.add(bt_result)
        db.commit()

        return {
            "status": status,
            "signal_id": signal.id,
            "pnl": pnl,
            "exit_price": exit_price,
            "exit_reason": exit_reason,
            "holding_days": holding_days
        }

    except Exception as e:
        logger.error(f"Error backtesting signal {signal_id}: {str(e)}")
        db.rollback()
        return {"error": str(e), "signal_id": signal_id, "status": "ERROR"}
    finally:
        db.close()


def run_all_backtest():
    """
    Runs backtest for all OPEN signals in database.
    """
    db = SessionLocal()
    signals = db.query(Signal).filter(Signal.status == "OPEN").all()
    results = []
    
    for signal in signals:
        res = run_single_backtest(signal.id)
        results.append(res)
        
    success = sum(1 for r in results if r.get("status") in ("TARGET_HIT", "SL_HIT", "EXPIRED"))
    found_errors = sum(1 for r in results if r.get("status") in ("DATA_NOT_FOUND", "TOO_RECENT", "ERROR"))
    
    db.close()
    return {
        "total_processed": len(signals),
        "success": success,
        "failed_or_skipped": found_errors,
        "results": results
    }


def get_backtest_summary() -> dict:
    """
    Returns Win Rate, Avg P&L, Max Drawdown, Sharpe Ratio, Profit Factor, Best Stock/Channel.
    """
    db = SessionLocal()
    try:
        signals = db.query(Signal).filter(Signal.status.in_(["TARGET_HIT", "SL_HIT", "EXPIRED"])).all()
        
        if not signals:
            return {
                "win_rate": 0, "avg_pnl": 0, "max_drawdown": 0, "sharpe_ratio": 0,
                "profit_factor": 0, "best_stock": "N/A", "best_channel": "N/A"
            }
            
        pnls = [s.pnl for s in signals if s.pnl is not None]
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p <= 0]
        
        win_rate = (len(wins) / len(pnls) * 100) if pnls else 0
        avg_pnl = np.mean(pnls) if pnls else 0
        
        gross_profit = sum(wins)
        gross_loss = abs(sum(losses))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf') if gross_profit > 0 else 0
        
        # Calculate max drawdown
        cumulative = np.cumsum(pnls)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = running_max - cumulative
        max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0
        
        # Sharpe ratio
        std_pnl = np.std(pnls) if len(pnls) > 1 else 0
        sharpe_ratio = 0
        if std_pnl > 0:
            returns = np.array(pnls)
            avg_return = np.mean(returns)
            sharpe_ratio = (avg_return / std_pnl) * math.sqrt(252)
            
        # Best stock
        stock_pnl = {}
        for s in signals:
            stock_pnl[s.stock] = stock_pnl.get(s.stock, 0) + (s.pnl or 0)
        best_stock = max(stock_pnl.items(), key=lambda x: x[1])[0] if stock_pnl else "N/A"
        
        # Best channel
        channel_pnl = {}
        for s in signals:
            channel_pnl[s.channel_name] = channel_pnl.get(s.channel_name, 0) + (s.pnl or 0)
        best_channel = max(channel_pnl.items(), key=lambda x: x[1])[0] if channel_pnl else "N/A"

        return {
            "win_rate": round(win_rate, 2),
            "avg_pnl": round(avg_pnl, 2),
            "max_drawdown": round(max_drawdown, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "profit_factor": round(profit_factor, 2) if profit_factor != float('inf') else "∞",
            "best_stock": best_stock,
            "best_channel": best_channel,
            "total_trades": len(pnls)
        }
    finally:
        db.close()
