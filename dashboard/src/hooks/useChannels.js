import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useChannels() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getChannels();
      if (result) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(new Error('Failed to fetch channels'));
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

  const addChannel = async (name) => {
    const result = await api.addChannel(name);
    if (result) {
      await fetchData(); // Refetch after adding
      return true;
    }
    return false;
  };

  return { data, loading, error, refetch: fetchData, lastUpdated, addChannel };
}
