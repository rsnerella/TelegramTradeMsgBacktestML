const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const fetchWithHandling = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    return null;
  }
};

export const api = {
  getSignals: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.channel && filters.channel !== 'All') params.append('channel', filters.channel);
    if (filters.action && filters.action !== 'All') params.append('action', filters.action);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchWithHandling(`/signals${queryString}`);
    return data || [];
  },

  getChannels: async () => {
    const data = await fetchWithHandling('/channels');
    return data || [];
  },

  addChannel: async (name) => {
    return await fetchWithHandling('/channels', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  getSummaryStats: async () => {
    const data = await fetchWithHandling('/stats/summary');
    return data || {
      totalSignals: 0,
      winRate: 0,
      totalPnl: 0,
      openTrades: 0
    };
  },

  getEquityData: async () => {
    const data = await fetchWithHandling('/stats/equity');
    return data || [];
  },

  getChannelStats: async () => {
    const data = await fetchWithHandling('/stats/channels');
    return data || [];
  },

  getRawMessages: async () => {
    const data = await fetchWithHandling('/messages/raw');
    return data || [];
  },

  runBacktest: async () => {
    return await fetchWithHandling('/backtest/run', {
      method: 'POST',
    });
  },

  runBacktestAll: async () => {
    return await fetchWithHandling('/backtest/run-all', {
      method: 'POST',
    });
  },

  runBacktestSingle: async (id) => {
    return await fetchWithHandling(`/backtest/run/${id}`, {
      method: 'POST',
    });
  },

  getBacktestResults: async () => {
    const data = await fetchWithHandling('/backtest/results');
    return data || [];
  },

  getBacktestSummary: async () => {
    const data = await fetchWithHandling('/backtest/summary');
    return data || {};
  },

  getBestStocks: async () => {
    const data = await fetchWithHandling('/backtest/best-stocks');
    return data || [];
  },

  getWorstStocks: async () => {
    const data = await fetchWithHandling('/backtest/worst-stocks');
    return data || [];
  }
};
