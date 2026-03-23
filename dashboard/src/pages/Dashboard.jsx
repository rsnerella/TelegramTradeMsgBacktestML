import MetricCard from '../components/MetricCard';
import EquityChart from '../components/EquityChart';
import SignalsTable from '../components/SignalsTable';
import ChannelStats from '../components/ChannelStats';
import { dashboardMetrics, signals } from '../data/mockData';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          metric="totalSignals"
          value={dashboardMetrics.totalSignals}
          change={12.5}
        />
        <MetricCard
          metric="winRate"
          value={dashboardMetrics.winRate}
          change={5.2}
          format="percent"
        />
        <MetricCard
          metric="totalPnl"
          value={dashboardMetrics.totalPnl}
          change={18.3}
          format="currency"
        />
        <MetricCard
          metric="openTrades"
          value={dashboardMetrics.openTrades}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EquityChart />
        </div>
        <SignalsTable signals={signals} compact={true} />
      </div>

      <ChannelStats />
    </div>
  );
}
