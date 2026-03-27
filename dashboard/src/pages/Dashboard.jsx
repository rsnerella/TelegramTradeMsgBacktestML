import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import EquityChart from '../components/EquityChart';
import SignalsTable from '../components/SignalsTable';
import ChannelStats from '../components/ChannelStats';
import { useStats } from '../hooks/useStats';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { api } from '../services/api';

export default function Dashboard() {
  const { summaryData, equityData, channelStats, loading: statsLoading, error: statsError } = useStats();

  // Backtest state
  const [backtestSummary, setBacktestSummary] = useState(null);
  const [backtestResults, setBacktestResults] = useState([]);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(true);

  const fetchBacktestData = async () => {
    setBacktestLoading(true);
    try {
      const summary = await api.getBacktestSummary();
      const results = await api.getBacktestResults();
      setBacktestSummary(summary);
      setBacktestResults(results);
    } catch (error) {
      console.error("Failed to fetch backtest data", error);
    } finally {
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    fetchBacktestData();
  }, []);

  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    try {
      await api.runBacktestAll();
      await fetchBacktestData(); // Refresh data after run
    } catch (error) {
      console.error("Backtest run failed", error);
    } finally {
      setIsBacktesting(false);
    }
  };

  const isLoading = statsLoading || backtestLoading;
  const errorMsg = statsError ? "⚠️ Backend offline. Run: cd backend && uvicorn main:app --reload" : null;

  return (
    <div className="p-6 space-y-6">
      {errorMsg && <ErrorBanner message={errorMsg} />}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              metric="totalSignals"
              value={summaryData?.totalSignals || 0}
            />
            <MetricCard
              metric="winRate"
              value={summaryData?.winRate || 0}
              format="percent"
            />
            <MetricCard
              metric="totalPnl"
              value={summaryData?.totalPnl || 0}
              format="currency"
            />
            <MetricCard
              metric="openTrades"
              value={summaryData?.openTrades || 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EquityChart data={equityData} />
            </div>
            <SignalsTable compact={true} />
          </div>

          <ChannelStats data={channelStats} />

          {/* Backtest Results Section */}
          <div className="mt-12 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Backtest Results</h2>
                <p className="text-gray-400 text-sm mt-1">Real historical price-based evaluation across all signals.</p>
              </div>
              <button
                onClick={handleRunBacktest}
                disabled={isBacktesting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-indigo to-accent-purple text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
              >
                {isBacktesting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Backtest
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                metric="winRate"
                value={backtestSummary?.win_rate || 0}
                format="percent"
              />
              <MetricCard
                metric="sharpeRatio"
                value={backtestSummary?.sharpe_ratio || 0}
                format="number"
              />
              <MetricCard
                metric="profitFactor"
                value={backtestSummary?.profit_factor || 0}
                format="number"
              />
              <MetricCard
                metric="maxDrawdown"
                value={backtestSummary?.max_drawdown || 0}
                format="currency"
              />
            </div>

            <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-bg/50 border-b border-dark-border text-xs uppercase text-gray-400 font-semibold tracking-wider">
                      <th className="px-6 py-4">Stock</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Entry</th>
                      <th className="px-6 py-4">Exit</th>
                      <th className="px-6 py-4">P&amp;L</th>
                      <th className="px-6 py-4">Exit Reason</th>
                      <th className="px-6 py-4">Days Held</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {backtestResults?.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          No backtest results available. Click &quot;Run Backtest&quot; to generate.
                        </td>
                      </tr>
                    ) : (
                      backtestResults?.map((result, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{result.stock || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.action === 'BUY' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
                            }`}>
                              {result.action || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {result.entry ? `₹${result.entry.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {result.exit ? `₹${result.exit.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-medium ${
                              result.pnl > 0 ? 'text-accent-green' : result.pnl < 0 ? 'text-accent-red' : 'text-gray-400'
                            }`}>
                              {result.pnl > 0 ? '+' : ''}{result.pnl ? `₹${result.pnl.toFixed(2)}` : '₹0.00'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-300 bg-white/5 px-2 py-1 rounded text-xs">
                              {result.exit_reason || result.status || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                            {result.days_held !== undefined ? `${result.days_held} days` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
