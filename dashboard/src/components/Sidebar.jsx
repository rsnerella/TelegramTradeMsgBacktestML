import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: TrendingUp, label: 'Signals', path: '/signals' },
  { icon: FileText, label: 'NER Parser', path: '/ner-parser' },
  { icon: BarChart3, label: 'Channels', path: '/channels' },
  { icon: Zap, label: 'Backtest', path: '/backtest' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-dark-card border-r border-dark-border flex flex-col items-center py-4 z-50">
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
      </div>

      <nav className="flex-1 flex flex-col items-center gap-2 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="group relative w-12 h-12 flex items-center justify-center rounded-lg transition-all hover:bg-accent-indigo/20"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-accent-indigo' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              {isActive && (
                <div className="absolute left-0 w-1 h-8 bg-accent-indigo rounded-r-full" />
              )}
              <div className="absolute left-16 bg-dark-lighter px-3 py-2 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-dark-border">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
        TK
      </div>
    </div>
  );
}
