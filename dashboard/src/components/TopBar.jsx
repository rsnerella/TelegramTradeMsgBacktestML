import { liveIndexData } from '../data/mockData';

export default function TopBar() {
  return (
    <div className="fixed left-16 right-0 top-0 h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-white">
          Telegram Trade Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {liveIndexData.map((index) => (
          <div
            key={index.name}
            className="flex items-center gap-3 px-3 py-1.5 bg-dark-lighter rounded-md border border-dark-border"
          >
            <span className="text-xs font-medium text-gray-400 w-20">{index.name}</span>
            <span className="text-sm font-mono text-white">{index.value.toLocaleString()}</span>
            {index.change >= 0 ? (
              <span className="text-xs font-mono text-accent-green">+{index.change} (+{index.changePercent}%)</span>
            ) : (
              <span className="text-xs font-mono text-accent-red">{index.change} ({index.changePercent}%)</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date().toLocaleString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}
        </span>
      </div>
    </div>
  );
}
