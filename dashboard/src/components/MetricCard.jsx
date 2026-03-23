import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Activity, Clock } from 'lucide-react';

const metricConfig = {
  totalSignals: { icon: Activity, label: 'Total Signals', color: 'from-blue-500 to-blue-600' },
  winRate: { icon: TrendingUp, label: 'Win Rate', color: 'from-emerald-500 to-emerald-600' },
  totalPnl: { icon: DollarSign, label: 'Total P&L', color: 'from-purple-500 to-purple-600' },
  openTrades: { icon: Clock, label: 'Open Trades', color: 'from-orange-500 to-orange-600' },
};

export default function MetricCard({ metric, value, change, format = 'number' }) {
  const config = metricConfig[metric];
  const Icon = config.icon;

  const formatValue = (val) => {
    if (format === 'percent') return `${val}%`;
    if (format === 'currency') return `₹${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6 hover:border-accent-indigo/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-400">{config.label}</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white mb-1">
            {formatValue(value)}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${
              change >= 0 ? 'text-accent-green' : 'text-accent-red'
            }`}>
              {change >= 0 ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
              <span className="font-mono">{change >= 0 ? '+' : ''}{change}%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
