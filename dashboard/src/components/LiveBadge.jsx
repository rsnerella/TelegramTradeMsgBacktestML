export default function LiveBadge({ lastUpdated, error }) {
  if (error) {
    return (
      <div className="flex items-center text-xs text-red-400 bg-red-950/50 px-2 py-1 rounded-full border border-red-900/50">
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
        Offline
      </div>
    );
  }

  const isStale = lastUpdated && (new Date() - new Date(lastUpdated)) > 60000; // > 60s

  return (
    <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${isStale ? 'text-yellow-400 bg-yellow-950/50 border-yellow-900/50' : 'text-green-400 bg-green-950/50 border-green-900/50'}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${isStale ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
      {isStale ? 'Stale Data' : 'Live'}
    </div>
  );
}
