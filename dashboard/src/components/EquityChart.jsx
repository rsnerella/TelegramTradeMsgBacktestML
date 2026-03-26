import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-2">{label}</p>
        <p className="text-lg font-mono text-white">
          ₹{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function EquityChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 h-full flex flex-col justify-center items-center text-gray-400">
        No equity data available
      </div>
    );
  }

  const initialValue = data[0]?.equity || 0;
  const finalValue = data[data.length - 1]?.equity || 0;
  const totalReturn = initialValue ? ((finalValue - initialValue) / initialValue) * 100 : 0;

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Equity Curve</h2>
          <p className="text-sm text-gray-400">Portfolio performance over time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Current Value</p>
            <p className="text-xl font-mono text-white">₹{finalValue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Return</p>
            <p className={`text-xl font-mono ${totalReturn >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#4b5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#4b5563"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#equityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
