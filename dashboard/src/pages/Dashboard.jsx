import MetricCard from '../components/MetricCard';
import EquityChart from '../components/EquityChart';
import SignalsTable from '../components/SignalsTable';
import ChannelStats from '../components/ChannelStats';
import { useStats } from '../hooks/useStats';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function Dashboard() {
  const { summaryData, equityData, channelStats, loading: statsLoading, error: statsError } = useStats();

  const isLoading = statsLoading;
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
        </>
      )}
    </div>
  );
}
