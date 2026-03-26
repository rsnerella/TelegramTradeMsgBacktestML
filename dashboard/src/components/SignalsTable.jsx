import { useState, useMemo } from 'react';
import { Filter, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { useSignals } from '../hooks/useSignals';
import LoadingSpinner from './LoadingSpinner';
import ErrorBanner from './ErrorBanner';

const statusColors = {
  'TARGET HIT': 'bg-green-500/10 text-green-400 border-green-500/30',
  'SL HIT': 'bg-red-500/10 text-red-400 border-red-500/30',
  'OPEN': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const actionColors = {
  'BUY': 'bg-emerald-500/10 text-emerald-400',
  'SELL': 'bg-red-500/10 text-red-400',
};

export default function SignalsTable({ compact = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pass channel and action filters to API
  const apiFilters = useMemo(() => {
    return {
      channel: filterChannel !== 'all' ? filterChannel : undefined,
      action: filterAction !== 'all' ? filterAction : undefined,
    };
  }, [filterChannel, filterAction]);

  const { data: signals = [], loading, error, refetch, lastUpdated } = useSignals(compact ? {} : apiFilters);

  const filteredSignals = signals
    .filter((signal) => {
      const matchesSearch =
        signal.stock?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.channel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || signal.status === filterStatus;
      // In compact mode, we might not pass filters to API, so we filter locally just in case
      const matchesChannel = compact ? true : (filterChannel === 'all' || signal.channel === filterChannel);
      const matchesAction = compact ? true : (filterAction === 'all' || signal.action === filterAction);
      
      return matchesSearch && matchesStatus && matchesChannel && matchesAction;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp) - new Date(b.timestamp);
      } else if (sortBy === 'pnl') {
        comparison = (a.pnl || 0) - (b.pnl || 0);
      } else if (sortBy === 'confidence') {
        comparison = (a.confidence || 0) - (b.confidence || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const channels = [...new Set(signals.map((s) => s.channel).filter(Boolean))];

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 flex flex-col h-full">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Signals</h3>
        
        {loading && <LoadingSpinner />}
        {error && <div className="text-red-400 text-sm py-4">Failed to load signals</div>}
        
        {!loading && !error && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {filteredSignals.slice(0, 5).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between p-3 bg-dark-lighter rounded-lg border border-dark-border">
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${actionColors[signal.action] || 'bg-gray-800 text-gray-400'}`}>
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
                      {signal.pnl >= 0 ? '+' : ''}₹{(signal.pnl || 0).toFixed(2)}
                    </p>
                    <p className={`text-xs ${signal.pnl >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                      {signal.pnl >= 0 ? '+' : ''}{(signal.pnlPercent || 0).toFixed(2)}%
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[signal.status] || 'border-gray-500 text-gray-400'}`}>
                    {signal.status}
                  </span>
                </div>
              </div>
            ))}
            {filteredSignals.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">No recent signals</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Trading Signals</h2>
          <span className="text-xs bg-dark-lighter text-gray-400 py-1 px-2 rounded-md border border-dark-border">
            Total: {signals.length}
          </span>
          <button 
            onClick={refetch}
            disabled={loading}
            className="p-1.5 bg-dark-lighter hover:bg-dark-border text-gray-400 hover:text-white rounded-md transition-colors disabled:opacity-50"
            title="Refresh signals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-indigo' : ''}`} />
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search stock or channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-dark-lighter border border-dark-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50 w-full sm:w-64"
            />
          </div>
          
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-dark-lighter border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-indigo/50"
          >
            <option value="all">All Actions</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          
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

      {error ? (
        <ErrorBanner message="Failed to load signals from backend. Please ensure the server is running." />
      ) : loading && signals.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full relative">
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
              <tbody className={loading ? 'opacity-50' : ''}>
                {filteredSignals.map((signal) => (
                  <tr key={signal.id} className="border-b border-dark-border hover:bg-dark-lighter/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-400">{formatDate(signal.timestamp)}</td>
                    <td className="py-3 px-4 text-sm text-white">{signal.channel}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{signal.stock}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[signal.action] || 'bg-gray-800 text-gray-400'}`}>
                        {signal.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white">₹{(signal.entry || 0).toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-emerald-400">₹{(signal.target || 0).toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-red-400">₹{(signal.sl || 0).toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-dark-lighter rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${signal.confidence >= 0.8 ? 'bg-green-500' : signal.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${(signal.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-400">{((signal.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[signal.status] || 'border-gray-500 text-gray-400'}`}>
                        {signal.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-right">
                        <p className={`font-mono ${(signal.pnl || 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {(signal.pnl || 0) >= 0 ? '+' : ''}₹{(signal.pnl || 0).toFixed(2)}
                        </p>
                        <p className={`text-xs ${(signal.pnl || 0) >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                          {(signal.pnl || 0) >= 0 ? '+' : ''}{(signal.pnlPercent || 0).toFixed(2)}%
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
        </>
      )}
    </div>
  );
}
