"""
Regex NER Parser for Trading Signals
Extracts entities like STOCK, ACTION, ENTRY, TARGET, SL from Telegram messages
"""
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class ParsedSignal:
    """Parsed trading signal data"""
    raw_message: str
    stock: Optional[str] = None
    action: Optional[str] = None  # BUY or SELL
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    sl_price: Optional[float] = None
    confidence: float = 0.0
    entities: List[Dict] = None

    def __post_init__(self):
        if self.entities is None:
            self.entities = []


class TradingSignalParser:
    """
    Regex-based NER parser for trading signals from Telegram messages
    Handles various message formats and patterns
    """

    # Stock/company name patterns - NIFTY indices and common stock tickers
    STOCK_PATTERNS = [
        r'\b(?:NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX)\b',  # Indices
        r'\b(?:RELIANCE|TCS|INFY|HDFC|ICICI|SBIN|BAJFINANCE|BHARTIARTL|ITC|KOTAKBANK|LICI|HINDUNILVR|LT|AXISBANK|ASIANPAINT|MARUTI|SUNPHARMA|TITAN)\b',  # Large caps
        r'\b(?:TATAMOTORS|TATASTEEL|TCS|TATAPOWER|TATAELXSI)\b',  # Tata group
        r'\b(?:ADANIENT|ADANIPORTS|ADANIGREEN|ADANITRANS|ADANIPOWER)\b',  # Adani group
        r'\b(?:AUBANK|AARTIDRUGS|AAVAS|ABB|ABCAPITAL|ABFRL|ACC|ADANIGAS|ADANIPORTS|ADANIPOWER|ADANITRANS)\b',  # Starting with A
        r'\b(?:ZEE|ZEEL|ZENSARTECH|ZYLOG|ZENOTECH)\b',  # Starting with Z
        r'\b(?:[A-Z]{2,6})\b'  # Generic 2-6 uppercase letters
    ]

    # Action patterns
    ACTION_PATTERNS = [
        r'\bBUY\b',
        r'\bSELL\b',
        r'\bBuy\b',
        r'\bSell\b',
    ]

    # Entry price patterns
    ENTRY_PATTERNS = [
        r'(?:CMP|Entry|entry|@|current|above|below|ABOVE|BELOW)[:\s]*([0-9]+\.?[0-9]*)',
        r'(?: BUY\s+)([A-Z]+)\s+([0-9]+\.?[0-9]*)',  # BUY RELIANCE 2840
        r'(?: SELL\s+)([A-Z]+)\s+([0-9]+\.?[0-9]*)',  # SELL TCS 3500
    ]

    # Target/Multiple targets patterns
    TARGET_PATTERNS = [
        r'(?:TGT|TARGET|tgts|t1|t2|t3|T1|T2|T3|Target)[:\s]*([0-9]+\.?[0-9]*)',
        r'target[si]?\s*[:=]?\s*([0-9]+\.?[0-9]*)',
        r'(?:T1|T2|T3)\s*[:=]?\s*([0-9]+\.?[0-9]*)',
    ]

    # Stop Loss patterns
    SL_PATTERNS = [
        r'(?:SL|Stop\s*Loss|stoploss|STOPLOSS|Stop\s*Loss)[:\s]*([0-9]+\.?[0-9]*)',
        r'sl\s*[:=]?\s*([0-9]+\.?[0-9]*)',
        r'SL:\s*([0-9]+\.?[0-9]*)',
        r'(?:Stop\s*Loss)\s*[:=]?\s*([0-9]+\.?[0-9]*)',
    ]

    def __init__(self):
        # Compile regex patterns for performance
        self.stock_regex = re.compile('|'.join(self.STOCK_PATTERNS), re.IGNORECASE)
        self.action_regex = re.compile('|'.join(self.ACTION_PATTERNS), re.IGNORECASE)
        self.entry_regex = re.compile('|'.join(self.ENTRY_PATTERNS), re.IGNORECASE)
        self.target_regex = re.compile('|'.join(self.TARGET_PATTERNS), re.IGNORECASE)
        self.sl_regex = re.compile('|'.join(self.SL_PATTERNS), re.IGNORECASE)

        # General price pattern for fallback
        self.price_regex = re.compile(r'\b[0-9]+\.?[0-9]*\b')

    def clean_message(self, message: str) -> str:
        """Remove emojis and special characters"""
        # Remove emojis (unicode ranges for emojis)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F700-\U0001F77F"  # alchemical symbols
            "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
            "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
            "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
            "\U0001FA00-\U0001FA6F"  # Chess Symbols
            "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
            "\U00002702-\U000027B0"  # Dingbats
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE
        )
        return emoji_pattern.sub('', message)

    def extract_action(self, text: str) -> Optional[str]:
        """Extract BUY or SELL action"""
        match = self.action_regex.search(text)
        if match:
            action = match.group(0).upper()
            if action in ['BUY', 'SELL']:
                return action
        return None

    def extract_stock(self, text: str, action: Optional[str]) -> Optional[str]:
        """Extract stock ticker/symbol"""
        # First try to find stock near BUY/SELL
        if action:
            action_pattern = re.compile(rf'\b{action}\s+([A-Z]+)\b', re.IGNORECASE)
            match = action_pattern.search(text)
            if match:
                return match.group(1).upper()

        # Fall back to general stock pattern
        matches = self.stock_regex.findall(text)
        for match in matches:
            stock = match.upper()
            # Filter out common non-stock words
            if stock not in ['BUY', 'SELL', 'SL', 'TARGET', 'CMP', 'ENTRY', 'EXIT', 'STOP',
                             'TGT', 'T1', 'T2', 'T3', 'ABOVE', 'BELOW', 'AND', 'OR']:
                return stock

        return None

    def extract_entry_price(self, text: str) -> Optional[float]:
        """Extract entry price"""
        # CMP pattern
        for pattern in self.ENTRY_PATTERNS[:1]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except (ValueError, IndexError):
                    pass

        # BUY/SELL + STOCK + PRICE pattern
        if 'BUY' in text.upper():
            buy_pattern = re.compile(r'BUY\s+([A-Z]+)\s+([0-9]+\.?[0-9]*)', re.IGNORECASE)
            match = buy_pattern.search(text)
            if match:
                try:
                    return float(match.group(2))
                except (ValueError, IndexError):
                    pass
        elif 'SELL' in text.upper():
            sell_pattern = re.compile(r'SELL\s+([A-Z]+)\s+([0-9]+\.?[0-9]*)', re.IGNORECASE)
            match = sell_pattern.search(text)
            if match:
                try:
                    return float(match.group(2))
                except (ValueError, IndexError):
                    pass

        # @ pattern
        at_pattern = re.compile(r'@\s*([0-9]+\.?[0-9]*)', re.IGNORECASE)
        match = at_pattern.search(text)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                pass

        return None

    def extract_target_price(self, text: str) -> Optional[float]:
        """Extract target price (first target if multiple)"""
        match = self.target_regex.search(text)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                pass
        return None

    def extract_all_targets(self, text: str) -> List[float]:
        """Extract all target prices (T1, T2, T3, etc.)"""
        targets = []
        matches = self.target_regex.finditer(text)
        for match in matches:
            try:
                targets.append(float(match.group(1)))
            except (ValueError, IndexError):
                pass
        # Return unique targets (first occurrence only)
        return list(dict.fromkeys(targets))

    def extract_sl_price(self, text: str) -> Optional[float]:
        """Extract stop loss price"""
        match = self.sl_regex.search(text)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                pass
        return None

    def calculate_confidence(self, parsed: ParsedSignal) -> float:
        """Calculate confidence score based on completeness of parsed entities"""
        score = 0.0

        # Action is critical (+30 points)
        if parsed.action:
            score += 30

        # Stock is critical (+25 points)
        if parsed.stock:
            score += 25

        # Entry price is important (+20 points)
        if parsed.entry_price:
            score += 20

        # Target price (+15 points)
        if parsed.target_price:
            score += 15

        # Stop loss (+10 points)
        if parsed.sl_price:
            score += 10

        return score

    def parse(self, message: str) -> ParsedSignal:
        """
        Parse a Telegram message and extract trading entities

        Args:
            message: Raw Telegram message text

        Returns:
            ParsedSignal object with extracted entities
        """
        clean_text = self.clean_message(message)
        text = clean_text.upper() if clean_text else message.upper()

        signal = ParsedSignal(raw_message=message)

        # Extract entities
        signal.action = self.extract_action(text)
        signal.stock = self.extract_stock(text, signal.action)
        signal.entry_price = self.extract_entry_price(text)
        signal.target_price = self.extract_target_price(text)
        signal.sl_price = self.extract_sl_price(text)

        # Calculate confidence
        signal.confidence = self.calculate_confidence(signal)

        # Build entity list for NER display
        signal.entities = self._build_entities(signal, message)

        return signal

    def _build_entities(self, signal: ParsedSignal, original_message: str) -> List[Dict]:
        """Build entity list for NER highlighting in frontend"""
        entities = []

        if signal.stock:
            idx = self._find_entity_index(original_message, signal.stock, 'STOCK', signal.confidence)
            if idx:
                entities.append(idx)

        if signal.action:
            idx = self._find_entity_index(original_message, signal.action, 'ACTION', signal.confidence)
            if idx:
                entities.append(idx)

        if signal.entry_price:
            idx = self._find_entity_index(original_message, str(signal.entry_price), 'ENTRY', signal.confidence)
            if idx:
                entities.append(idx)

        if signal.target_price:
            idx = self._find_entity_index(original_message, str(signal.target_price), 'TARGET', signal.confidence)
            if idx:
                entities.append(idx)

        if signal.sl_price:
            idx = self._find_entity_index(original_message, str(signal.sl_price), 'SL', signal.confidence)
            if idx:
                entities.append(idx)

        return entities

    def _find_entity_index(self, message: str, text: str, entity_type: str, confidence: float = 0.0) -> Optional[Dict]:
        """Find start and end index of entity in message"""
        start = message.upper().find(text.upper())
        if start != -1:
            return {
                'type': entity_type,
                'text': text,
                'start': start,
                'end': start + len(text),
                'confidence': round(confidence / 100, 2) if confidence else 0.85  # Default confidence
            }
        return None

    def parse_batch(self, messages: List[str]) -> List[ParsedSignal]:
        """Parse multiple messages in batch"""
        return [self.parse(msg) for msg in messages]


# Global parser instance
parser = TradingSignalParser()


def parse_message(message: str) -> Dict:
    """
    Convenience function to parse a single message

    Args:
        message: Raw Telegram message

    Returns:
        Dictionary with parsed signal data
    """
    signal = parser.parse(message)
    return {
        'raw_message': signal.raw_message,
        'stock': signal.stock,
        'action': signal.action,
        'entry_price': signal.entry_price,
        'target_price': signal.target_price,
        'sl_price': signal.sl_price,
        'confidence': signal.confidence,
        'entities': signal.entities,
        'has_signal': signal.confidence >= 30  # Minimum threshold for valid signal
    }


# Example usage and testing
if __name__ == "__main__":
    test_messages = [
        "BUY RELIANCE CMP 2840 TGT 2920 SL 2790",
        "SELL INFY @ 1520 Target: 1460 Stop Loss: 1555",
        "🚀 TATAMOTORS BUY 890 T1: 940 T2: 980 SL: 865",
        "HDFC BANK BUY ABOVE 1600 SL 1580 TGT 1660",
    ]

    for msg in test_messages:
        result = parse_message(msg)
        print(f"\nMessage: {msg}")
        print(f"Parsed: {result}")
