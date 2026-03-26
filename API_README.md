# API Backend Setup

## Installation

1. Install Python dependencies:
```bash
pip install flask flask-restful flask-cors python-dotenv transformers torch
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Run the API server:
```bash
python API_backend.py
```

## API Endpoints

### POST /classifyner
Parse a trading message using NER model.

Request:
```json
{
  "data": "BUY RELIANCE ABOVE 2680 SL 2650 TARGET 2750"
}
```

Response:
```json
{
  "sentence": "[\"BUY\", \"RELIANCE\", \"ABOVE\", \"2680\", \"SL\", \"2650\", \"TARGET\", \"2750\"]",
  "sentence_class": "[1, 10, 0, 3, 9, 3, 5, 3]",
  "sentence_class_name": "[\"btst\", \"symbol\", \"\", \"enter\", \"sl\", \"enter\", \"exit\", \"enter\"]"
}
```

### GET /health
Check API status.

Response:
```json
{
  "status": "healthy",
  "model": "loaded"
}
```

## Configuration

Environment variables (`.env`):
- `FLASK_PORT` - Flask server port (default: 3737)
- `FLASK_DEBUG` - Debug mode (default: True)
- `HUGGINGFACE_MODEL_ID` - HuggingFace model ID
- `HUGGINGFACE_TOKEN` - HuggingFace token (optional)
