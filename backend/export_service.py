import io
import csv
import pandas as pd
from typing import List
from sqlalchemy.orm import Session
from models import BacktestResult

class ExportService:
    """
    Handles rendering database contents into flat analytical files (CSV format).
    """

    @staticmethod
    def generate_backtest_csv(db: Session, limit: int = 1000) -> str:
        """
        Generates a clean CSV file string from the latest backtest results.
        
        Args:
            db (Session): SQLAlchemy database session.
            limit (int): Maximum number of rows to export. Defaults to 1000.
            
        Returns:
            str: CSV formatted string.
        """
        # Fetch results, ordering by the latest exit time first
        results: List[BacktestResult] = db.query(BacktestResult).order_by(
            BacktestResult.exit_time.desc().nullslast()
        ).limit(limit).all()

        if not results:
            return "no_data_available\n"

        # Create an in-memory string buffer
        output = io.StringIO()
        writer = csv.writer(output)

        # Define CSV header mapping
        headers = [
            "ID", "Signal ID", "Stock", "Action", "Entry Price", "Target Price", 
            "Stop Loss", "Status", "Exit Price", "P&L", "Exit Reason", 
            "Entry Time", "Exit Time", "Duration (Days)"
        ]
        writer.writerow(headers)

        # Iterate and write each row
        for r in results:
            duration_days = None
            if r.entry_time and r.exit_time:
                duration_days = round((r.exit_time - r.entry_time).total_seconds() / 86400, 2)
            
            row = [
                r.id,
                r.signal_id,
                r.stock,
                r.action,
                r.entry_price,
                r.target_price,
                r.sl_price,
                r.status,
                r.exit_price,
                round(r.pnl, 2) if r.pnl is not None else "",
                r.exit_reason,
                r.entry_time.strftime("%Y-%m-%d %H:%M") if r.entry_time else "",
                r.exit_time.strftime("%Y-%m-%d %H:%M") if r.exit_time else "",
                duration_days if duration_days is not None else ""
            ]
            writer.writerow(row)

        return output.getvalue()

    @staticmethod
    def generate_signals_csv(db: Session, limit: int = 1000) -> str:
        """
        Exports the raw signals table just in case the user wants to audit it.
        """
        from models import Signal
        signals: List[Signal] = db.query(Signal).order_by(Signal.created_at.desc()).limit(limit).all()
        
        if not signals:
            return "no_data_available\n"

        output = io.StringIO()
        writer = csv.writer(output)
        
        headers = [
            "ID", "Stock", "Action", "Entry", "Target", "StopLoss", "Confidence", "Channel", "Created At"
        ]
        writer.writerow(headers)
        
        for s in signals:
            row = [
                s.id, s.stock, s.action, s.entry_price, s.target_price, s.sl_price, 
                s.confidence, s.channel_name, s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else ""
            ]
            writer.writerow(row)
            
        return output.getvalue()

# Singleton instance for quick access
exporter = ExportService()
