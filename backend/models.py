"""
Database models for Telegram Trading Signals Backtest System
Using SQLAlchemy ORM with SQLite
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Channel(Base):
    """Telegram trading channel information"""
    __tablename__ = 'channels'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    telegram_id = Column(Integer, unique=True, nullable=True)
    username = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    last_fetched_at = Column(DateTime, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationship with signals
    signals = relationship("Signal", back_populates="channel", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'telegram_id': self.telegram_id,
            'username': self.username,
            'is_active': self.is_active,
            'last_fetched_at': self.last_fetched_at.isoformat() if self.last_fetched_at else None,
            'added_at': self.added_at.isoformat(),
            'signal_count': len(self.signals) if self.signals else 0
        }


class Signal(Base):
    """Parsed trading signal from Telegram messages"""
    __tablename__ = 'signals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(Integer, ForeignKey('channels.id'), nullable=False)

    # Raw message data
    raw_message = Column(Text, nullable=False)
    channel_name = Column(String(100), nullable=False)
    message_id = Column(Integer, nullable=True)
    message_date = Column(DateTime, nullable=True)

    # Parsed entities
    stock = Column(String(50), nullable=True, index=True)
    action = Column(String(10), nullable=True)  # BUY or SELL
    entry_price = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    sl_price = Column(Float, nullable=True)

    # Metadata
    confidence = Column(Float, default=0.0)  # 0-100 score based on parsing completeness
    status = Column(String(20), default='OPEN')  # OPEN, TARGET_HIT, SL_HIT, EXPIRED
    pnl = Column(Float, default=0.0)
    points = Column(Float, default=0.0)

    # Timestamps
    entry_time = Column(DateTime, default=datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)
    exit_price = Column(Float, nullable=True)
    exit_reason = Column(String(50), nullable=True)  # TARGET, SL, MANUAL, EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    channel = relationship("Channel", back_populates="signals")
    backtest_results = relationship("BacktestResult", back_populates="signal", cascade="all, delete-orphan")

    def calculate_pnl(self):
        """Calculate P&L based on current data"""
        if not self.entry_price or not self.exit_price:
            return 0.0

        if self.action == 'BUY':
            self.pnl = self.exit_price - self.entry_price
        elif self.action == 'SELL':
            self.pnl = self.entry_price - self.exit_price
        else:
            self.pnl = 0.0

        return self.pnl

    def to_dict(self, include_details=False):
        data = {
            'id': self.id,
            'channel_id': self.channel_id,
            'channel_name': self.channel_name,
            'raw_message': self.raw_message,
            'stock': self.stock,
            'action': self.action,
            'entry_price': self.entry_price,
            'target_price': self.target_price,
            'sl_price': self.sl_price,
            'confidence': self.confidence,
            'status': self.status,
            'pnl': self.pnl,
            'points': self.points,
            'entry_time': self.entry_time.isoformat() if self.entry_time else None,
            'exit_time': self.exit_time.isoformat() if self.exit_time else None,
            'exit_price': self.exit_price,
            'exit_reason': self.exit_reason,
            'created_at': self.created_at.isoformat(),
        }

        if include_details:
            data['message_id'] = self.message_id
            data['message_date'] = self.message_date.isoformat() if self.message_date else None
            data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None

        return data


class BacktestResult(Base):
    """Detailed backtest results for each signal"""
    __tablename__ = 'backtest_results'

    id = Column(Integer, primary_key=True, autoincrement=True)
    signal_id = Column(Integer, ForeignKey('signals.id'), nullable=False)

    # Backtest data
    actual_entry_date = Column(DateTime, nullable=True)
    actual_exit_date = Column(DateTime, nullable=True)
    actual_entry_price = Column(Float, nullable=True)
    actual_exit_price = Column(Float, nullable=True)

    # OHLC data snapshot
    entry_open = Column(Float, nullable=True)
    entry_high = Column(Float, nullable=True)
    entry_low = Column(Float, nullable=True)
    entry_close = Column(Float, nullable=True)

    exit_open = Column(Float, nullable=True)
    exit_high = Column(Float, nullable=True)
    exit_low = Column(Float, nullable=True)
    exit_close = Column(Float, nullable=True)

    # Analysis
    pnl = Column(Float, default=0.0)
    holding_days = Column(Integer, default=0)
    max_drawdown = Column(Float, default=0.0)

    exit_reason = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    signal = relationship("Signal", back_populates="backtest_results")

    def to_dict(self):
        return {
            'id': self.id,
            'signal_id': self.signal_id,
            'actual_entry_date': self.actual_entry_date.isoformat() if self.actual_entry_date else None,
            'actual_exit_date': self.actual_exit_date.isoformat() if self.actual_exit_date else None,
            'actual_entry_price': self.actual_entry_price,
            'actual_exit_price': self.actual_exit_price,
            'entry_ohlc': {
                'open': self.entry_open,
                'high': self.entry_high,
                'low': self.entry_low,
                'close': self.entry_close
            },
            'exit_ohlc': {
                'open': self.exit_open,
                'high': self.exit_high,
                'low': self.exit_low,
                'close': self.exit_close
            },
            'pnl': self.pnl,
            'holding_days': self.holding_days,
            'max_drawdown': self.max_drawdown,
            'exit_reason': self.exit_reason,
            'notes': self.notes
        }


class RawMessage(Base):
    """Store raw Telegram messages for re-parsing"""
    __tablename__ = 'raw_messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(Integer, ForeignKey('channels.id'), nullable=False)

    message_id = Column(Integer, nullable=False)
    sender_id = Column(Integer, nullable=True)

    raw_text = Column(Text, nullable=False)
    message_date = Column(DateTime, nullable=True, index=True)

    has_media = Column(Boolean, default=False)
    media_type = Column(String(50), nullable=True)

    is_parsed = Column(Boolean, default=False, index=True)
    parsed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'raw_text': self.raw_text,
            'message_date': self.message_date.isoformat() if self.message_date else None,
            'has_media': self.has_media,
            'media_type': self.media_type,
            'is_parsed': self.is_parsed,
            'parsed_at': self.parsed_at.isoformat() if self.parsed_at else None,
            'created_at': self.created_at.isoformat()
        }
