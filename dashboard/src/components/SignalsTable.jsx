import { useState } from 'react';
import { Filter, Search, ArrowUpDown } from 'lucide-react';

const statusColors = {
  'TARGET HIT': 'bg-green-500/10 text-green-400 border-green-500/30',
  'SL HIT': 'bg-red-500/10 text-red-400 border-red-500/30',
  'OPEN': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const actionColors = {
  'BUY': 'bg-emerald-500/10 text-emerald-400',
  'SELL': 'bg-red-500/10 text-red-400',
};

export default function SignalsTable({ signals = [], compact = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredSignals = signals
    .filter((signal) => {
      const matchesSearch =
        signal.stock.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.channel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || signal.status === filterStatus;
      const matchesChannel = filterChannel === 'all' || signal.channel === filterChannel;
      return matchesSearch && matchesStatus && matchesChannel;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp) - new Date(b.timestamp);
      } else if (sortBy === 'pnl') {
        comparison = a.pnl - b.pnl;
      } else if (sortBy === 'confidence') {
        comparison = a.confidence - b.confidence;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const channels = [...new Set(signals.map((s) => s.channel))];

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Signals</h3>
        <div className="space-y-3">
          {filteredSignals.slice(0, 5).map((signal) => (
            <div key={signal.id} className="flex items-center justify-between p-3 bg-dark-lighter rounded-lg border border-dark-border">
              <div className="flex items-center gap-4">
                <div className={`px-2 py-1 rounded text-xs font-medium ${actionColors[signal.action]}`}>
                  {signal.action}
                </div>
                <div>
                  <p className="font-medium text-white">{signal.stock}</p>
                  <p className="text-xs text-gray-500">{formatDate(signal.timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-mono ${signal.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {signal.pnl >= 0 ? '+' : ''}₹{signal.pnl.toFixed(2)}
                  </p>
                  <p className={`text-xs ${signal.pnl >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                    {signal.pnl >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(2)}%
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[signal.status]}`}>
                  {signal.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Trading Signals</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search stock or channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-dark-lighter border border-dark-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50 w-64"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-indigo/50"
          >
            <option value="all">All Status</option>
            <option value="TARGET HIT">Target Hit</option>
            <option value="SL HIT">SL Hit</option>
            <option value="OPEN">Open</option>
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-indigo/50"
          >
            <option value="all">All Channels</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                <button
                  onClick={() => { setSortBy('timestamp'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Time {(sortBy === 'timestamp') && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Channel</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Stock</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Action</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Entry</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Target</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Stop Loss</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                <button
                  onClick={() => { setSortBy('confidence'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Conf. {(sortBy === 'confidence') && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Status</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                <button
                  onClick={() => { setSortBy('pnl'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  P&L {(sortBy === 'pnl') && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.map((signal) => (
              <tr key={signal.id} className="border-b border-dark-border hover:bg-dark-lighter/50 transition-colors">
                <td className="py-3 px-4 text-sm text-gray-400">{formatDate(signal.timestamp)}</td>
                <td className="py-3 px-4 text-sm text-white">{signal.channel}</td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-white">{signal.stock}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[signal.action]}`}>
                    {signal.action}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-white">₹{signal.entry.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-emerald-400">₹{signal.target.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-red-400">₹{signal.sl.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-dark-lighter rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${signal.confidence >= 0.8 ? 'bg-green-500' : signal.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${signal.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400">{(signal.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[signal.status]}`}>
                    {signal.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="text-right">
                    <p className={`font-mono ${signal.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {signal.pnl >= 0 ? '+' : ''}₹{signal.pnl.toFixed(2)}
                    </p>
                    <p className={`text-xs ${signal.pnl >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                      {signal.pnl >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSignals.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No signals match your filters</p>
        </div>
      )}
    </div>
  );
}
