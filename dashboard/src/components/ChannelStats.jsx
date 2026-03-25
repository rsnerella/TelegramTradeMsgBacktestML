import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 shadow-xl">
        <p className="text-sm font-medium text-white mb-3">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-8 mb-1">
            <p className="text-sm text-gray-400">{entry.name}</p>
            <p className={`text-sm font-mono ${entry.name === 'Win Rate' ? entry.value >= 60 ? 'text-green-400' : 'text-yellow-400' : entry.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {entry.name === 'Win Rate' ? entry.value + '%' : '₹' + entry.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316'];

export default function ChannelStats({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 h-full flex flex-col justify-center items-center text-gray-400">
        No channel stats available
      </div>
    );
  }

  const barData = data.map((stat, index) => ({
    name: stat.channel ? stat.channel.replace(/_/g, ' ') : 'Unknown',
    winRate: stat.winRate || 0,
    totalPnl: stat.totalPnl || 0,
    totalSignals: stat.totalSignals || 0,
  }));

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Channel Performance</h2>
          <p className="text-sm text-gray-400">Win rate and profit comparison across channels</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#4b5563"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              dy={10}
            />
            <YAxis
              yAxisId="left"
              stroke="#4b5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#4b5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value / 100).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]} barSize={40}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.winRate >= 70 ? '#22c55e' : entry.winRate >= 60 ? '#84cc16' : '#eab308'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
        {data.map((stat, index) => (
          <div
            key={stat.channel || index}
            className="bg-dark-lighter rounded-lg p-4 border border-dark-border hover:border-accent-indigo/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-xs text-gray-400 truncate">{stat.channel ? stat.channel.replace(/_/g, ' ') : 'Unknown'}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Win Rate</span>
                <span className={`font-mono text-sm ${stat.winRate >= 70 ? 'text-green-400' : stat.winRate >= 60 ? 'text-lime-400' : 'text-yellow-400'}`}>
                  {stat.winRate ? stat.winRate.toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Signals</span>
                <span className="font-mono text-sm text-white">{stat.totalSignals || 0}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Total P&L</span>
                <span className={`font-mono text-sm ${(stat.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(stat.totalPnl || 0) >= 0 ? '+' : ''}₹{stat.totalPnl ? stat.totalPnl.toFixed(0) : 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
