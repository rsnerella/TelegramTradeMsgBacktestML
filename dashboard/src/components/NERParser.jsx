import { useState } from 'react';
import { Bot, Sparkles, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { nerMessages } from '../data/mockData';

const entityColors = {
  STOCK: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  ACTION: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  ENTRY: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  TARGET: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  SL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  CONFIDENCE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
};

const confidenceLevels = {
  high: { icon: CheckCircle, color: 'text-green-400', label: 'High' },
  medium: { icon: AlertCircle, color: 'text-yellow-400', label: 'Medium' },
  low: { icon: XCircle, color: 'text-red-400', label: 'Low' },
};

export default function NERParser() {
  const [selectedMessage, setSelectedMessage] = useState(nerMessages[0]);
  const [newMessage, setNewMessage] = useState('');

  const renderHighlightedMessage = (message) => {
    let highlightedText = [];
    let lastIndex = 0;

    const sortedEntities = [...message.entities].sort((a, b) => a.start - b.start);

    for (const entity of sortedEntities) {
      if (entity.start > lastIndex) {
        highlightedText.push(
          <span key={`text-${lastIndex}`} className="text-gray-300">
            {message.rawMessage.substring(lastIndex, entity.start)}
          </span>
        );
      }

      const colors = entityColors[entity.type];
      highlightedText.push(
        <span
          key={`entity-${entity.start}`}
          className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border} font-mono text-sm cursor-help`}
          title={`${entity.type} (${(entity.confidence * 100).toFixed(0)}%)`}
        >
          {message.rawMessage.substring(entity.start, entity.end)}
        </span>
      );

      lastIndex = entity.end;
    }

    if (lastIndex < message.rawMessage.length) {
      highlightedText.push(
        <span key={`text-${lastIndex}`} className="text-gray-300">
          {message.rawMessage.substring(lastIndex)}
        </span>
      );
    }

    return highlightedText;
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.85) return confidenceLevels.high;
    if (confidence >= 0.7) return confidenceLevels.medium;
    return confidenceLevels.low;
  };

  const parseNewMessage = () => {
    // Simulate NER parsing
    const parseResult = {
      id: Date.now(),
      rawMessage: newMessage,
      entities: [],
      timestamp: new Date().toISOString(),
      channel: 'Manual',
      processed: true,
    };

    // Simple regex-based parsing for demo
    const buySellMatch = newMessage.match(/(BUY|SELL)/i);
    if (buySellMatch) {
      parseResult.entities.push({
        type: 'ACTION',
        text: buySellMatch[0].toUpperCase(),
        confidence: 0.95,
        start: buySellMatch.index,
        end: buySellMatch.index + buySellMatch[0].length,
      });
    }

    const stockMatch = newMessage.match(/[A-Z]{2,}/g);
    stockMatch?.forEach((stock) => {
      if (stock !== 'BUY' && stock !== 'SELL' && stock !== 'SL' && stock !== 'ABOVE' && stock !== 'BELOW') {
        parseResult.entities.push({
          type: 'STOCK',
          text: stock,
          confidence: 0.88,
          start: newMessage.indexOf(stock),
          end: newMessage.indexOf(stock) + stock.length,
        });
      }
    });

    const priceMatches = [...newMessage.matchAll(/\d+(?:\.\d+)?/g)];
    let priceIndex = 0;
    priceMatches.forEach((match) => {
      const price = parseFloat(match[0]);
      if (price > 10 && price < 50000) {
        let type = 'ENTRY';
        if (newMessage.toLowerCase().includes('sl') && priceIndex === 1) type = 'SL';
        else if (priceIndex === 1) type = 'TARGET';
        else if (priceIndex >= 2) type = 'TARGET';

        parseResult.entities.push({
          type,
          text: match[0],
          confidence: 0.85,
          start: match.index,
          end: match.index + match[0].length,
        });
        priceIndex++;
      }
    });

    setSelectedMessage(parseResult);
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-dark-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">NER Parser</h2>
                <p className="text-sm text-gray-400">ML-based entity extraction from Telegram messages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">BERT-based NER Model</span>
            </div>
          </div>

          <div className="bg-dark-lighter rounded-lg p-4 mb-6 border border-dark-border">
            <p className="font-mono text-sm leading-relaxed">
              {renderHighlightedMessage(selectedMessage)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 mb-2">Channel</p>
              <p className="text-sm text-white">{selectedMessage.channel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Timestamp</p>
              <p className="text-sm text-white font-mono">
                {new Date(selectedMessage.timestamp).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-3">Extracted Entities</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedMessage.entities.map((entity, index) => {
                const { bg, text, border } = entityColors[entity.type];
                const level = getConfidenceLevel(entity.confidence);
                const Icon = level.icon;
                return (
                  <div key={index} className={`p-3 rounded-lg border ${bg} ${border}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${text}`}>{entity.type}</span>
                      <Icon className={`w-3 h-3 ${level.color}`} />
                    </div>
                    <p className="text-sm font-semibold text-white font-mono">{entity.text}</p>
                    <p className="text-xs mt-1 text-gray-400">
                      {level.label} ({(entity.confidence * 100).toFixed(0)}%)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-dark-card rounded-xl border border-dark-border p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Test Parser</h3>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Paste a Telegram trading message...
Example:
BUY RELIANCE ABOVE 2680
SL 2650
TARGET 2750"
              className="w-full h-32 bg-dark-lighter border border-dark-border rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent-indigo/50 font-mono"
            />
            <button
              onClick={parseNewMessage}
              disabled={!newMessage.trim()}
              className="w-full mt-3 bg-accent-indigo hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Parse Message
            </button>
          </div>

          <div className="bg-dark-card rounded-xl border border-dark-border p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Message History</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {nerMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedMessage?.id === msg.id
                      ? 'bg-accent-indigo/20 border-accent-indigo/50'
                      : 'bg-dark-lighter border-dark-border hover:border-dark-border hover:bg-dark-lighter/50'
                  }`}
                >
                  <p className="text-xs text-gray-400 mb-1">{msg.channel}</p>
                  <p className="text-sm text-white line-clamp-2">{msg.rawMessage.slice(0, 50)}...</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-card rounded-xl border border-dark-border p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Entity Legend</h3>
            <div className="space-y-2">
              {Object.entries(entityColors).map(([type, colors]) => (
                <div key={type} className={`flex items-center gap-2 p-2 rounded ${colors.bg}`}>
                  <span className={`text-xs font-medium ${colors.text}`}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
