import { channels, channelStats, signals } from '../data/mockData';
import { Users, TrendingUp, DollarSign, Activity, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316'];

export default function Channels() {
  const pieData = channels.map((channel, index) => ({
    name: channel.name,
    value: signals.filter(s => s.channel === channel.name).length,
    subscribers: channel.subscribers,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
          <p className="text-sm text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <p className="text-sm text-gray-400">{entry.name}</p>
              <p className="text-sm font-mono text-white">{entry.value}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {channelStats.map((stat, index) => {
          const channel = channels.find(c => c.name.replace(/_/g, '_') === stat.channel.replace(/_/g, '_')) || channels[index % channels.length];
          return (
            <div key={stat.channel} className="bg-dark-card rounded-xl border border-dark-border p-5 hover:border-accent-indigo/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors[index % colors.length] + '30' }}>
                  <Activity className="w-5 h-5" style={{ color: colors[index % colors.length] }} />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-mono ${stat.winRate >= 70 ? 'bg-green-500/20 text-green-400' : stat.winRate >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  {stat.winRate.toFixed(1)}% WR
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">{stat.channel.replace('_', ' ')}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <Users className="w-3 h-3" />
                <span>{channel?.subscribers.toLocaleString() || 'N/A'} subscribers</span>
              </div>
              <div className="space-y-2 pt-3 border-t border-dark-border">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500">Signals</span>
                  <span className="font-mono text-sm text-white">{stat.totalSignals}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500">Avg P&L</span>
                  <span className={`font-mono text-sm ${stat.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.avgPnl >= 0 ? '+' : ''}₹{stat.avgPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500">Total P&L</span>
                  <span className={`font-mono text-sm ${stat.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.totalPnl >= 0 ? '+' : ''}₹{stat.totalPnl.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Channel Signal Distribution</h3>
          <p className="text-sm text-gray-400 mb-6">Number of signals per channel</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
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
                  stroke="#4b5563"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  barSize={50}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Signal Share</h3>
          <p className="text-sm text-gray-400 mb-6">Percentage of signals from each channel</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-dark-card rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Channel Rankings</h3>
            <p className="text-sm text-gray-400">Compare channels by performance metrics</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">#</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Channel</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Subscribers</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Win Rate
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Total Signals
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Total P&L
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {channelStats
                .sort((a, b) => b.totalPnl - a.totalPnl)
                .map((stat, index) => {
                  const channel = channels.find(c => c.name.replace(/_/g, '_') === stat.channel.replace(/_/g, '_')) || channels[index % channels.length];
                  const isTopPerformer = index === 0;
                  return (
                    <tr key={stat.channel} className={`border-b border-dark-border hover:bg-dark-lighter/50 transition-colors ${isTopPerformer ? 'bg-green-500/5' : ''}`}>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-bold ${index < 3 ? 'text-white' : 'text-gray-400'}`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: colors[index % colors.length] }}>
                            {stat.channel[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white">{stat.channel.replace('_', ' ')}</p>
                            {isTopPerformer && (
                              <p className="text-xs text-green-400 flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                Top Performer
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-300">
                          {channel?.subscribers.toLocaleString() || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`font-mono text-sm ${stat.winRate >= 70 ? 'text-green-400' : stat.winRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stat.winRate.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-dark-lighter rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${stat.winRate >= 70 ? 'bg-green-500' : stat.winRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${stat.winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-white">{stat.totalSignals}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-mono text-sm ${stat.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.totalPnl >= 0 ? '+' : ''}₹{stat.totalPnl.toFixed(0)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isTopPerformer
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : stat.totalPnl >= 0
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {isTopPerformer ? 'Recommended' : stat.totalPnl >= 0 ? 'Active' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
