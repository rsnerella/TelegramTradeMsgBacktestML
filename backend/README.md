# Backend - Telegram Trading Signals Backtest API

FastAPI backend for parsing Telegram trading messages, storing signals, and running backtests.

## Quick Start

### 1. Get Telegram API Credentials

1. Go to https://my.telegram.org/apps
2. Sign in with your phone number
3. Create a new application
4. Copy `API_ID` and `API_HASH`

### 2. Set Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:
```
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
PHONE_NUMBER=+919876543210
```

### 3. Install Dependencies

```bash
pip install -r ../requirements.txt
```

Or using uv:
```bash
uv pip install -r ../requirements.txt
```

### 4. Run the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access API

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## API Endpoints

### Signals
- `GET /signals` - Get all signals (with filters)
- `GET /signals/{id}` - Get single signal
- `POST /signals/parse` - Parse a message (doesn't save)
- `POST /signals/save` - Parse and save a signal

### Channels
- `GET /channels` - Get all channels
- `POST /channels` - Add new channel
- `POST /channels/{id}/sync` - Sync messages from Telegram

### Stats
- `GET /stats/summary` - Overall summary stats
- `GET /stats/equity` - Daily P&L for equity curve
- `GET /stats/channels` - Per-channel performance

### Backtest
- `POST /backtest/run` - Run backtest (single or all signals)

### Raw Messages
- `GET /messages/raw` - Get unparsed messages

## Project Structure

```
backend/
├── main.py           # FastAPI app with all endpoints
├── database.py       # SQLite setup with SQLAlchemy
├── models.py         # DB models (Signal, Channel, BacktestResult)
├── parser.py         # Regex NER parser for trading signals
├── telegram_client.py # Telethon client for fetching messages
├── backtest.py       # Backtest engine using yfinance
├── .env.example      # Environment variables template
└── README.md         # This file
```

## Connecting to React Frontend

Update your React dashboard's API base URL:
```javascript
// dashboard/src/api/ner.js
const API_BASE = 'http://localhost:8000';
```

The server includes CORS middleware for `http://localhost:5173`.

## Testing

Test the parser:
```bash
python parser.py
```

Test Telegram connection:
```bash
python telegram_client.py
```

Run backtest:
```bash
python backtest.py
```

## Development Notes

- The parser uses regex patterns to extract STOCK, ACTION, ENTRY, TARGET, SL
- Confidence score (0-100) based on parsing completeness
- Backtest uses yfinance for historical OHLC data
- 5-day holding period by default for signals without explicit exit
- Signals can have multiple targets (T1, T2, T3)
