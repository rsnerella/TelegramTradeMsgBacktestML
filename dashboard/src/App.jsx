import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Signals from './pages/Signals';
import NERParser from './components/NERParser';
import Backtest from './pages/Backtest';
import Channels from './pages/Channels';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/signals" element={<Signals />} />
            <Route path="/ner-parser" element={<NERParser />} />
            <Route path="/backtest" element={<Backtest />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
