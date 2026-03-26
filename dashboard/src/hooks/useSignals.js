import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useSignals(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getSignals(filters);
      if (result) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(new Error('Failed to fetch signals'));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}
