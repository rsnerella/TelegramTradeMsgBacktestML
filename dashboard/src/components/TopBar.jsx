import { useState, useEffect } from 'react';
import LiveBadge from './LiveBadge';
import { useStats } from '../hooks/useStats';

export default function TopBar() {
  const { lastUpdated, error } = useStats();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - new Date(lastUpdated)) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="fixed left-16 right-0 top-0 h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-white">
          Telegram Trade Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {lastUpdated && !error && (
          <span className="text-sm font-mono text-gray-400">
            Last updated: {secondsAgo} seconds ago
          </span>
        )}
        <LiveBadge lastUpdated={lastUpdated} error={error} />
      </div>
    </div>
  );
}
