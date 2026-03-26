import { useState, useEffect } from 'react';
import { Play, Calendar, DollarSign, Percent, TrendingUp, TrendingDown, Loader2, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-2">{label}</p>
        <p className="text-lg font-mono text-white">₹{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    );
  }
  return null;
};

export default function Backtest() {
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [backtestData, setBacktestData] = useState(null);

  // Real data state
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [equityData, setEquityData] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const periods = [
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchRealData = async () => {
    setLoading(true);
    try {
      const resData = await api.getBacktestResults();
      const sumData = await api.getBacktestSummary();
      setResults(resData || []);
      setSummary(sumData || null);

      // Process equity curve from real results
      if (resData && resData.length > 0) {
        // Sort ascending by exit time
        const sorted = [...resData].filter(r => r.exit_time).sort((a, b) => new Date(a.exit_time) - new Date(b.exit_time));

        // Filter by selected period
        let filtered = sorted;
        if (selectedPeriod !== 'all') {
          const now = new Date();
          let cutoff = new Date();
          if (selectedPeriod === '1m') cutoff.setMonth(now.getMonth() - 1);
          if (selectedPeriod === '3m') cutoff.setMonth(now.getMonth() - 3);
          if (selectedPeriod === '6m') cutoff.setMonth(now.getMonth() - 6);
          if (selectedPeriod === '1y') cutoff.setFullYear(now.getFullYear() - 1);
          filtered = sorted.filter(r => new Date(r.exit_time) >= cutoff);
        }

        let currentEquity = Number(initialCapital);
        const eqData = [];
        const monthMap = {};

        filtered.forEach(trade => {
          currentEquity += (trade.pnl || 0);
          const d = new Date(trade.exit_time);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          eqData.push({
            date: dateStr,
            equity: currentEquity,
            rawDate: d
          });

          // Monthly aggregation
          if (!monthMap[monthStr]) {
            monthMap[monthStr] = { month: monthStr, pnl: 0, trades: 0, wins: 0, losses: 0, totalWinPnl: 0, totalLossPnl: 0 };
          }
          monthMap[monthStr].pnl += (trade.pnl || 0);
          monthMap[monthStr].trades += 1;
          if ((trade.pnl || 0) > 0) {
            monthMap[monthStr].wins += 1;
            monthMap[monthStr].totalWinPnl += trade.pnl;
          } else {
            monthMap[monthStr].losses += 1;
            monthMap[monthStr].totalLossPnl += trade.pnl;
          }
        });

        // Downsample equity curve if it's too dense (max 60 points for chart)
        let sampledEq = eqData;
        if (eqData.length > 60) {
          const step = Math.ceil(eqData.length / 60);
          sampledEq = eqData.filter((_, i) => i % step === 0);
          if (sampledEq[sampledEq.length - 1] !== eqData[eqData.length - 1]) {
            sampledEq.push(eqData[eqData.length - 1]);
          }
        }

        setEquityData(sampledEq);

        const mStats = Object.values(monthMap).map(m => ({
          ...m,
          returnPct: (m.pnl / initialCapital) * 100,
          avgWin: m.wins > 0 ? (m.totalWinPnl / m.wins).toFixed(2) : 0,
          avgLoss: m.losses > 0 ? (m.totalLossPnl / m.losses).toFixed(2) : 0,
        }));

        setMonthlyStats(mStats);
      } else {
        setEquityData([]);
        setMonthlyStats([]);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, [selectedPeriod, initialCapital]);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    setError(null);
    try {
      await api.runBacktestAll();
      await fetchRealData();
    } catch (err) {
      setError('Failed to run backtest. Ensure backend is running.');
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/backtest/export/csv`, '_blank');
  };
};

const finalEquity = equityData.length > 0 ? equityData[equityData.length - 1].equity : initialCapital;
const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

// Real max drawdown calculation across all points
let peak = initialCapital;
let maxDD = 0;
equityData.forEach(pt => {
  if (pt.equity > peak) peak = pt.equity;
  const dd = ((peak - pt.equity) / peak) * 100;
  if (dd > maxDD) maxDD = dd;
});

return (
  <div className="p-6 space-y-6">
    <div className="bg-dark-card rounded-xl border border-dark-border p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-1">Advanced Analytics</h2>
          <p className="text-sm text-gray-400">Deep dive into algorithm performance and historical curves</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-dark-bg p-1 rounded-lg border border-dark-border">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${selectedPeriod === period.value
                    ? 'bg-gradient-to-r from-accent-indigo to-accent-purple text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg rounded-lg border border-dark-border">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Base Cap:</label>
            <div className="flex items-center text-accent-green">
              <span>₹</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-24 bg-transparent text-sm text-white font-mono focus:outline-none ml-1"
                disabled={isRunning}
              />
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-dark-lighter hover:bg-dark-border border border-dark-border text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4 text-accent-indigo" />
            CSV
          </button>

          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className={`px-5 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${isRunning
                ? 'bg-dark-border cursor-not-allowed text-gray-500'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white'
              }`}
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Crunching Data...' : 'RE-RUN ENGINE'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-dark-border rounded-lg mb-6">
          <Loader2 className="w-8 h-8 animate-spin text-accent-indigo mb-3" />
          <p className="font-medium animate-pulse">Loading execution matrix...</p>
        </div>
      ) : equityData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-dark-border rounded-lg mb-6">
          <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-lg">No closed trades found for this period</p>
          <p className="text-sm mt-1 opacity-60">Try expanding the date range or running the engine</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-dark-lighter to-dark-bg rounded-xl p-5 border border-dark-border relative overflow-hidden group">
              <div className="absolute inset-0 bg-accent-indigo/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-accent-indigo/10 text-accent-indigo rounded-lg"><DollarSign className="w-5 h-5" /></div>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Final Equity</span>
              </div>
              <p className="text-3xl font-mono text-white relative z-10">₹{finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>

            <div className="bg-gradient-to-br from-dark-lighter to-dark-bg rounded-xl p-5 border border-dark-border relative overflow-hidden group">
              <div className="absolute inset-0 bg-accent-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg"><Percent className="w-5 h-5" /></div>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Period Return</span>
              </div>
              <p className={`text-3xl font-mono relative z-10 ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-dark-lighter to-dark-bg rounded-xl p-5 border border-dark-border relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Max Drawdown</span>
              </div>
              <p className="text-3xl font-mono text-red-400 relative z-10">{maxDD.toFixed(2)}%</p>
            </div>

            <div className="bg-gradient-to-br from-dark-lighter to-dark-bg rounded-xl p-5 border border-dark-border relative overflow-hidden group">
              <div className="absolute inset-0 bg-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-accent-purple/10 text-accent-purple rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Win Rate</span>
              </div>
              <p className="text-3xl font-mono text-white relative z-10">{summary?.win_rate || 0}%</p>
            </div>
          </div>

          <div className="h-[400px] mb-8 bg-dark-bg/30 p-4 rounded-xl border border-dark-border/50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <defs>
                  <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={totalReturn >= 0 ? '#3b82f6' : '#ef4444'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={totalReturn >= 0 ? '#3b82f6' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#2a3441' }}
                  minTickGap={30}
                />
                <YAxis
                  domain={['dataMin - 5000', 'dataMax + 5000']}
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke={totalReturn >= 0 ? '#3b82f6' : '#ef4444'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#backtestGradient)"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>

    {monthlyStats.length > 0 && !loading && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-card rounded-xl border border-dark-border p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-indigo" />
            Monthly Returns Profile
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#2a3441' }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff0a' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-lg">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                          <p className={`text-xl font-mono ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="returnPct"
                  radius={[4, 4, 0, 0]}
                >
                  {monthlyStats.map((entry, index) => (
                    <rect
                      key={index}
                      fill={entry.returnPct >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-2xl font-mono text-red-400">{stats.maxDrawdown.toFixed(2)}%</p>
        </div>
        <p className="text-2xl font-mono text-white">{summary?.win_rate || 0}%</p>
      </div>
        </div>

        {
  !loading && equityData.length === 0 && !isRunning && !error && (
    <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-dark-border rounded-lg mb-6">
      <Play className="w-8 h-8 mb-3 opacity-50" />
      <p>Click "RE-RUN ENGINE" to generate performance results</p>
    </div>
  )
}

{
  equityData.length > 0 && !loading && (
    <>
      <div className="h-[400px] mb-8 bg-dark-bg/30 p-4 rounded-xl border border-dark-border/50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityData}>
            <defs>
              <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={totalReturn >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={totalReturn >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
            <XAxis
              dataKey="date"
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
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="equity"
              stroke={totalReturn >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#backtestGradient)"
              dot={false}
              activeDot={{ r: 6, fill: totalReturn >= 0 ? '#10b981' : '#ef4444', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
      </div >

{
  monthlyStats.length > 0 && !loading && (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-indigo" />
          Monthly Returns
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#2a3441' }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={{ fill: '#ffffff0a' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-xl font-mono ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="returnPct"
                radius={[4, 4, 0, 0]}
              >
                {monthlyStats.map((entry, index) => (
                  <rect
                    key={index}
                    fill={entry.returnPct >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-dark-card rounded-xl border border-dark-border p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-purple" />
          Trade Execution Log
        </h3>
        <div className="space-y-4 max-h-[20rem] overflow-y-auto pr-2 custom-scrollbar">
          {monthlyStats.slice().reverse().map((stat) => (
            <div key={stat.month} className="bg-dark-lighter rounded-lg p-4 border border-dark-border hover:border-accent-indigo/30 transition-colors">
              <div className="flex items-center justify-between mb-3 border-b border-dark-border/50 pb-2">
                <span className="font-bold text-white text-sm uppercase tracking-wide">{stat.month}</span>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="text-gray-400 bg-dark-bg px-2 py-1 rounded">Vol: {stat.trades}</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">W: {stat.wins}</span>
                  <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded">L: {stat.losses}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Avg Win</span>
                  <span className="text-emerald-400 font-mono text-sm">₹{stat.avgWin}</span>
                </div>
                <div className="h-6 w-px bg-dark-border" />
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Avg Loss</span>
                  <span className="text-red-400 font-mono text-sm">₹{Math.abs(stat.avgLoss)}</span>
                </div>
                <div className="h-6 w-px bg-dark-border" />
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-gray-500">P/F</span>
                  <span className="text-white font-mono text-sm">
                    {stat.losses > 0 && stat.avgLoss !== 0 ? (Math.abs(stat.totalWinPnl / stat.totalLossPnl)).toFixed(2) : '∞'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
    </div >
  );
}
                      <span className="text-gray-400">
                        <span className="text-gray-500">Trades:</span> {stat.trades}
                      </span>
                      <span className="text-green-400">
                        W: {stat.wins}
                      </span>
                      <span className="text-red-400">
                        L: {stat.losses}
                      </span>
                      <span className="text-gray-400">
                        WR: {stat.trades > 0 ? ((stat.wins / stat.trades) * 100).toFixed(0) : 0}%
                      </span>
                    </div >
                  </div >
  <div className="flex items-center gap-6 text-xs">
    <div className="flex items-center gap-2">
      <TrendingUp className="w-3 h-3 text-green-500" />
      <span className="text-gray-400">Avg Win:</span>
      <span className="text-green-400 font-mono">₹{stat.avgWin}</span>
    </div>
    <div className="flex items-center gap-2">
      <TrendingDown className="w-3 h-3 text-red-500" />
      <span className="text-gray-400">Avg Loss:</span>
      <span className="text-red-400 font-mono">₹{stat.avgLoss}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-gray-400">Profit Factor:</span>
      <span className="text-white font-mono">{stat.losses > 0 && stat.avgLoss !== 0 ? (stat.avgWin * stat.wins / Math.abs(stat.avgLoss * stat.losses)).toFixed(2) : 'N/A'}</span>
    </div>
  </div>
                </div >
              ))}
            </div >
          </div >
        </div >
      )}
    </div >
  );
}

// Quick stub missing icon fallback
const Activity = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

