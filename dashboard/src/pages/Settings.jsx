import { useState } from 'react';
import {
  Save,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  Server,
  Shield,
} from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('••••••••••••••••');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiId, setApiId] = useState('•••••••••');
  const [showApiId, setShowApiId] = useState(false);
  const [apiHash, setApiHash] = useState('••••••••••••••••••••••••••••••••');
  const [showApiHash, setShowApiHash] = useState(false);

  const [channels, setChannels] = useState([
    { id: 1, name: 'NSE_Signals_Pro', enabled: true },
    { id: 2, name: 'StockGuru_India', enabled: true },
    { id: 3, name: 'Options_Alpha', enabled: true },
    { id: 4, name: 'Intraday_Calls', enabled: false },
    { id: 5, name: 'BankNifty_Calls', enabled: true },
  ]);

  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [newChannel, setNewChannel] = useState('');

  const toggleChannel = (id) => {
    setChannels(channels.map((ch) =>
      ch.id === id ? { ...ch, enabled: !ch.enabled } : ch
    ));
  };

  const removeChannel = (id) => {
    setChannels(channels.filter((ch) => ch.id !== id));
  };

  const addChannel = () => {
    if (newChannel.trim()) {
      setChannels([
        ...channels,
        { id: Date.now(), name: newChannel.trim(), enabled: true },
      ]);
      setNewChannel('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-gray-400">Configure your Telegram API connection and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Telegram API Credentials</h3>
              <p className="text-sm text-gray-400">Enter your Telegram API details to connect</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API ID</label>
              <div className="relative">
                <input
                  type={showApiId ? 'text' : 'password'}
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50 pr-10"
                  placeholder="12345678"
                />
                <button
                  onClick={() => setShowApiId(!showApiId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showApiId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Get your API ID from my.telegram.org</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API Hash</label>
              <div className="relative">
                <input
                  type={showApiHash ? 'text' : 'password'}
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50 pr-10"
                  placeholder="Your API hash from my.telegram.org"
                />
                <button
                  onClick={() => setShowApiHash(!showApiHash)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showApiHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bot API Token</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50 pr-10"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Create a bot via @BotFather on Telegram</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Watched Channels</h3>
              <p className="text-sm text-gray-400">Manage channels to monitor for signals</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChannel()}
              className="flex-1 bg-dark-lighter border border-dark-border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50"
              placeholder="Enter channel name (e.g., @NSE_Signals)"
            />
            <button
              onClick={addChannel}
              className="bg-accent-indigo hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-dark-lighter rounded-lg p-4 border border-dark-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleChannel(channel.id)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      channel.enabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        channel.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`font-medium ${channel.enabled ? 'text-white' : 'text-gray-500'}`}>
                    {channel.name}
                  </span>
                </div>
                <button
                  onClick={() => removeChannel(channel.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">ML Model Settings</h3>
              <p className="text-sm text-gray-400">Configure NER model parameters</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Confidence Threshold</label>
                <span className="text-sm font-mono text-accent-indigo">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-lighter rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Only process signals with confidence above this threshold
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-dark-lighter border-dark-border accent-indigo-500" />
                <span className="text-sm text-gray-300">Auto-close trades at market close</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-dark-lighter border-dark-border accent-indigo-500" />
                <span className="text-sm text-gray-300">Send notifications on trade exit</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-dark-lighter border-dark-border accent-indigo-500" />
                <span className="text-sm text-gray-300">Include partial profit booking</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Backend Configuration</h3>
              <p className="text-sm text-gray-400">API server connection settings</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint</label>
              <input
                type="text"
                defaultValue="http://localhost:5000/api"
                className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Polling Interval (seconds)</label>
              <input
                type="number"
                defaultValue="30"
                className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (seconds)</label>
              <input
                type="number"
                defaultValue="60"
                className="w-full bg-dark-lighter border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent-indigo/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
