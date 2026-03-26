"""
Backtest Engine - Calculate P&L for trading signals using historical OHLC data
Uses yfinance for fetching historical price data
"""
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, List
from models import Signal, BacktestResult
from database import SessionLocal


class BacktestEngine:
    """
    Engine for backtesting trading signals against historical data
    """

    # Stock ticker mappings (common Indian stocks to Yahoo Finance symbols)
    TICKER_MAPPING = {
        'RELIANCE': 'RELIANCE.NS',
        'TCS': 'TCS.NS',
        'INFY': 'INFY.NS',
        'HDFCBANK': 'HDFCBANK.NS',
        'HDFC': 'HDFCBANK.NS',
        'ICICIBANK': 'ICICIBANK.NS',
        'ICICI': 'ICICIBANK.NS',
        'SBIN': 'SBIN.NS',
        'SBI': 'SBIN.NS',
        'BAJFINANCE': 'BAJFINANCE.NS',
        'BHARTIARTL': 'BHARTIARTL.NS',
        'ITC': 'ITC.NS',
        'KOTAKBANK': 'KOTAKBANK.NS',
        'LICI': 'LICI.NS',
        'HINDUNILVR': 'HINDUNILVR.NS',
        'LT': 'LT.NS',
        'AXISBANK': 'AXISBANK.NS',
        'ASIANPAINT': 'ASIANPAINT.NS',
        'MARUTI': 'MARUTI.NS',
        'SUNPHARMA': 'SUNPHARMA.NS',
        'TITAN': 'TITAN.NS',
        'NIFTY': '^NSEI',
        'BANKNIFTY': '^NSEBANK',
        'FINNIFTY': 'CNXBANK.NS',
        'MIDCPNIFTY': 'NIFTYMIDCP50.NS',
        'SENSEX': '^BSESN',
        'TATAMOTORS': 'TATAMOTORS.NS',
        'TATASTEEL': 'TATASTEEL.NS',
        'TATAPOWER': 'TATAPOWER.NS',
        'TATAELXSI': 'TATAELXSI.NS',
        'ADANIENT': 'ADANIENT.NS',
        'ADANIPORTS': 'ADANIPORTS.NS',
        'ADANIGREEN': 'ADANIGREEN.NS',
        'ADANITRANS': 'ADANITRANS.NS',
        'ADANIPOWER': 'ADANIPOWER.NS',
        'AUBANK': 'AUBANK.NS',
        'ZEE': 'ZEEL.NS',
        'ZEEL': 'ZEEL.NS',
    }

    # Default holding period when no target/SL is hit
    DEFAULT_HOLDING_DAYS = 5

    def __init__(self):
        self.db = SessionLocal()

    def _get_yahoo_ticker(self, stock_name: str) -> str:
        """
        Convert stock name to Yahoo Finance ticker

        Args:
            stock_name: Stock symbol from signal

        Returns:
            Yahoo Finance ticker symbol
        """
        stock_name = stock_name.upper().strip()

        # Check mapping
        if stock_name in self.TICKER_MAPPING:
            return self.TICKER_MAPPING[stock_name]

        # Try direct lookup (if it's already a Yahoo ticker)
        if '.' in stock_name.upper():
            return stock_name.upper()

        # Default: append .NS for Indian stocks
        return f"{stock_name}.NS"

    def fetch_historical_data(
        self,
        ticker: str,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> Optional[Dict]:
        """
        Fetch historical OHLC data from Yahoo Finance

        Args:
            ticker: Yahoo Finance ticker symbol
            start_date: Start date for data
            end_date: End date for data (defaults to today)

        Returns:
            Dictionary with OHLC data or None if fetch fails
        """
        if end_date is None:
            end_date = datetime.utcnow()

        # Add buffer days to ensure we capture entry day
        start_buffer = start_date - timedelta(days=2)
        end_buffer = end_date + timedelta(days=2)

        try:
            # Format dates for yfinance
            start_str = start_buffer.strftime('%Y-%m-%d')
            end_str = end_buffer.strftime('%Y-%m-%d')

            # Fetch data
            data = yf.download(ticker, start=start_str, end=end_str, progress=False)

            if data.empty:
                print(f"No data found for {ticker}")
                return None

            # Convert DataFrame to dict
            data_dict = {}
            for date, row in data.iterrows():
                data_dict[date.strftime('%Y-%m-%d')] = {
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                }

            return data_dict

        except Exception as e:
            print(f"Error fetching data for {ticker}: {e}")
            return None

    def find_entry_price(
        self,
        ohlc_data: Dict,
        entry_date: datetime,
        target_price: float
    ) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
        """
        Find actual entry price from OHLC data

        Args:
            ohlc_data: Historical OHLC data
            entry_date: Signal entry date
            target_price: Target price to determine buy/sell logic

        Returns:
            Tuple of (open, high, low, close) prices on entry day
        """
        entry_date_str = entry_date.strftime('%Y-%m-%d')

        # Try to find exact date
        if entry_date_str in ohlc_data:
            return (
                ohlc_data[entry_date_str]['open'],
                ohlc_data[entry_date_str]['high'],
                ohlc_data[entry_date_str]['low'],
                ohlc_data[entry_date_str]['close']
            )

        # Find nearest future date if exact date not found
        sorted_dates = sorted(ohlc_data.keys())
        for date_str in sorted_dates:
            if date_str >= entry_date_str:
                return (
                    ohlc_data[date_str]['open'],
                    ohlc_data[date_str]['high'],
                    ohlc_data[date_str]['low'],
                    ohlc_data[date_str]['close']
                )

        return None, None, None, None

    def check_target_sl(
        self,
        ohlc_data: Dict,
        entry_date: datetime,
        action: str,
        entry_price: float,
        target_price: Optional[float],
        sl_price: Optional[float],
        max_days: int = 5
    ) -> Tuple[str, Optional[float], Optional[datetime]]:
        """
        Check if target or SL was hit within holding period

        Args:
            ohlc_data: Historical OHLC data
            entry_date: Signal entry date
            action: BUY or SELL
            entry_price: Entry price from signal
            target_price: Target price from signal
            sl_price: Stop loss price from signal
            max_days: Maximum holding days

        Returns:
            Tuple of (exit_reason, exit_price, exit_date)
        """
        if not target_price and not sl_price:
            # No target or SL, use default exit
            for day_offset in range(1, max_days + 1):
                date_str = (entry_date + timedelta(days=day_offset)).strftime('%Y-%m-%d')
                if date_str in ohlc_data:
                    return ('EXPIRED', ohlc_data[date_str]['close'],
                            datetime.strptime(date_str, '%Y-%m-%d'))
            return ('EXPIRED', entry_price, entry_date + timedelta(days=max_days))

        # Check each day after entry
        for day_offset in range(1, max_days + 1):
            date_str = (entry_date + timedelta(days=day_offset)).strftime('%Y-%m-%d')

            if date_str not in ohlc_data:
                continue

            day_data = ohlc_data[date_str]
            high = day_data['high']
            low = day_data['low']

            if action == 'BUY':
                # For BUY: check if target hit (price goes up) or SL hit (price goes down)
                if target_price and high >= target_price:
                    return ('TARGET', target_price, datetime.strptime(date_str, '%Y-%m-%d'))
                if sl_price and low <= sl_price:
                    return ('SL', sl_price, datetime.strptime(date_str, '%Y-%m-%d'))

            elif action == 'SELL':
                # For SELL: check if target hit (price goes down) or SL hit (price goes up)
                if target_price and low <= target_price:
                    return ('TARGET', target_price, datetime.strptime(date_str, '%Y-%m-%d'))
                if sl_price and high >= sl_price:
                    return ('SL', sl_price, datetime.strptime(date_str, '%Y-%m-%d'))

        # Check entry day as well (same day execution)
        entry_date_str = entry_date.strftime('%Y-%m-%d')
        if entry_date_str in ohlc_data:
            day_data = ohlc_data[entry_date_str]
            high = day_data['high']
            low = day_data['low']

            if action == 'BUY':
                if target_price and high >= target_price:
                    return ('TARGET', target_price, entry_date)
                if sl_price and low <= sl_price:
                    return ('SL', sl_price, entry_date)
            elif action == 'SELL':
                if target_price and low <= target_price:
                    return ('TARGET', target_price, entry_date)
                if sl_price and high >= sl_price:
                    return ('SL', sl_price, entry_date)

        # Neither hit within period
        exit_date_str = (entry_date + timedelta(days=min(max_days, len(ohlc_data)))).strftime('%Y-%m-%d')
        if exit_date_str in ohlc_data:
            exit_price = ohlc_data[exit_date_str]['close']
        else:
            exit_price = entry_price

        return ('EXPIRED', exit_price, datetime.strptime(exit_date_str, '%Y-%m-%d'))

    def calculate_pnl(self, signal: Signal) -> Optional[float]:
        """
        Calculate P&L for a single signal

        Args:
            signal: Signal object with entry/exit data

        Returns:
            P&L value or None if calculation fails
        """
        if not signal.action or not signal.entry_price or not signal.exit_price:
            return None

        if signal.action == 'BUY':
            return signal.exit_price - signal.entry_price
        elif signal.action == 'SELL':
            return signal.entry_price - signal.exit_price

        return None.0

    def backtest_signal(self, signal_id: int) -> Optional[Dict]:
        """
        Run backtest for a single signal

        Args:
            signal_id: Signal ID to backtest

        Returns:
            Dictionary with backtest results or None if failed
        """
        signal = self.db.query(Signal).filter(Signal.id == signal_id).first()
        if not signal:
            return None

        if not signal.stock or not signal.entry_price:
            return {'error': 'Signal has insufficient data for backtesting'}

        # Get Yahoo ticker
        ticker = self._get_yahoo_ticker(signal.stock)

        # Calculate end date for data fetching
        end_date = datetime.utcnow()

        # Fetch historical data
        ohlc_data = self.fetch_historical_data(
            ticker=ticker,
            start_date=signal.entry_time,
            end_date=end_date
        )

        if not ohlc_data:
            return {'error': f'Could not fetch data for {ticker}'}

        # Find entry prices
        entry_open, entry_high, entry_low, entry_close = self.find_entry_price(
            ohlc_data, signal.entry_time, signal.target_price or signal.entry_price
        )

        if not entry_open:
            return {'error': 'Entry date not found in historical data'}

        # Use actual entry price (use signal's entry_price as reference)
        actual_entry_price = signal.entry_price

        # Check target/SL
        exit_reason, exit_price, exit_date = self.check_target_sl(
            ohlc_data=ohlc_data,
            entry_date=signal.entry_time,
            action=signal.action,
            entry_price=actual_entry_price,
            target_price=signal.target_price,
            sl_price=signal.sl_price,
            max_days=self.DEFAULT_HOLDING_DAYS
        )

        # Calculate P&L
        if signal.action == 'BUY':
            pnl = exit_price - actual_entry_price
            points = exit_price - actual_entry_price
        elif signal.action == 'SELL':
            pnl = actual_entry_price - exit_price
            points = actual_entry_price - exit_price
        else:
            pnl = 0.0
            points = 0.0

        # Calculate holding days
        holding_days = (exit_date - signal.entry_time).days
        if holding_days < 0:
            holding_days = 0

        # Update signal
        signal.exit_price = exit_price
        signal.exit_time = exit_date
        signal.exit_reason = exit_reason
        signal.pnl = pnl
        signal.points = points
        signal.status = 'TARGET_HIT' if exit_reason == 'TARGET' else (
            'SL_HIT' if exit_reason == 'SL' else 'EXPIRED'
        )

        # Create backtest result record
        backtest_result = BacktestResult(
            signal_id=signal.id,
            actual_entry_date=signal.entry_time,
            actual_exit_date=exit_date,
            actual_entry_price=actual_entry_price,
            actual_exit_price=exit_price,
            entry_open=entry_open,
            entry_high=entry_high,
            entry_low=entry_low,
            entry_close=entry_close,
            exit_open=ohlc_data.get(exit_date.strftime('%Y-%m-%d'), {}).get('open'),
            exit_high=ohlc_data.get(exit_date.strftime('%Y-%m-%d'), {}).get('high'),
            exit_low=ohlc_data.get(exit_date.strftime('%Y-%m-%d'), {}).get('low'),
            exit_close=ohlc_data.get(exit_date.strftime('%Y-%m-%d'), {}).get('close'),
            pnl=pnl,
            holding_days=holding_days,
            max_drawdown=min(0, pnl) if action := 'BUY' else min(0, pnl),
            exit_reason=exit_reason
        )

        self.db.add(backtest_result)
        self.db.commit()

        return {
            'signal_id': signal.id,
            'stock': signal.stock,
            'entry_price': actual_entry_price,
            'exit_price': exit_price,
            'pnl': pnl,
            'points': points,
            'status': signal.status,
            'exit_reason': exit_reason,
            'holding_days': holding_days
        }

    def backtest_all(self, status_filter: str = 'OPEN') -> Dict:
        """
        Run backtest for all signals matching the status filter

        Args:
            status_filter: Filter signals by status (OPEN, etc.)

        Returns:
            Dictionary with summary statistics
        """
        query = self.db.query(Signal)

        if status_filter != 'ALL':
            query = query.filter(Signal.status == status_filter)

        signals = query.filter(
            Signal.stock.isnot(None),
            Signal.entry_price.isnot(None)
        ).all()

        results = []
        success_count = 0
        total_pnl = 0.0
        wins = 0
        losses = 0

        for signal in signals:
            result = self.backtest_signal(signal.id)
            if result and 'error' not in result:
                results.append(result)
                success_count += 1
                total_pnl += result.get('pnl', 0.0)
                if result.get('pnl', 0.0) > 0:
                    wins += 1
                else:
                    losses += 1

        return {
            'total_processed': len(signals),
            'success_count': success_count,
            'failed_count': len(signals) - success_count,
            'total_pnl': total_pnl,
            'wins': wins,
            'losses': losses,
            'win_rate': round((wins / success_count * 100) if success_count > 0 else 0, 2),
            'results': results
        }

    def get_equity_curve(self, days: int = 30) -> List[Dict]:
        """
        Get daily P&L data for equity curve chart

        Args:
            days: Number of days to fetch

        Returns:
            List of daily P&L data points
        """
        from datetime import date as date_type

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        signals = self.db.query(Signal).filter(
            Signal.exit_time.isnot(None),
            Signal.exit_time >= start_date
        ).order_by(Signal.exit_time).all()

        # Group by date
        daily_data = {}
        for signal in signals:
            date_key = signal.exit_time.date()
            if date_key not in daily_data:
                daily_data[date_key] = {
                    'date': date_key,
                    'pnl': 0.0,
                    'count': 0,
                    'wins': 0,
                    'losses': 0
                }
            daily_data[date_key]['pnl'] += signal.pnl or 0.0
            daily_data[date_key]['count'] += 1
            if signal.pnl and signal.pnl > 0:
                daily_data[date_key]['wins'] += 1
            elif signal.pnl and signal.pnl < 0:
                daily_data[date_key]['losses'] += 1

        # Calculate cumulative P&L
        result = []
        cumulative_pnl = 0.0
        sorted_dates = sorted(daily_data.keys())

        for date_key in sorted_dates:
            data = daily_data[date_key]
            cumulative_pnl += data['pnl']
            result.append({
                'date': date_key.strftime('%Y-%m-%d'),
                'pnl': round(data['pnl'], 2),
                'cumulative': round(cumulative_pnl, 2),
                'count': data['count'],
                'wins': data['wins'],
                'losses': data['losses']
            })

        return result

    def close(self):
        """Close database session"""
        self.db.close()


# Convenience functions
def backtest_single_signal(signal_id: int) -> Optional[Dict]:
    """Backtest a single signal"""
    engine = BacktestEngine()
    try:
        result = engine.backtest_signal(signal_id)
        return result
    finally:
        engine.close()


def backtest_open_signals() -> Dict:
    """Backtest all open signals"""
    engine = BacktestEngine()
    try:
        result = engine.backtest_all(status_filter='OPEN')
        return result
    finally:
        engine.close()


def get_equity_data(days: int = 30) -> List[Dict]:
    """Get equity curve data"""
    engine = BacktestEngine()
    try:
        result = engine.get_equity_curve(days=days)
        return result
    finally:
        engine.close()


if __name__ == "__main__":
    # Test backtest
    from database import init_db
    init_db()

    engine = BacktestEngine()

    # Get summary stats
    print("Backtesting all open signals...")
    summary = engine.backtest_all(status_filter='OPEN')
    print(f"Processed: {summary.get('total_processed')}")
    print(f"Success: {summary.get('success_count')}")
    print(f"Total P&L: {summary.get('total_pnl')}")
    print(f"Win Rate: {summary.get('win_rate')}%")

    engine.close()
