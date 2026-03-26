import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useStats() {
  const [summaryData, setSummaryData] = useState({
    totalSignals: 0,
    winRate: 0,
    totalPnl: 0,
    openTrades: 0
  });
  const [equityData, setEquityData] = useState([]);
  const [channelStats, setChannelStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [summary, equity, channels] = await Promise.all([
        api.getSummaryStats(),
        api.getEquityData(),
        api.getChannelStats()
      ]);

      if (summary && equity && channels) {
        setSummaryData(summary);
        setEquityData(equity);
        setChannelStats(channels);
        setError(null);
        setLastUpdated(new Date());
      } else {
         throw new Error('Some API requests failed');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  return { 
    summaryData, 
    equityData, 
    channelStats, 
    loading, 
    error, 
    refetch: fetchData,
    lastUpdated
  };
}
