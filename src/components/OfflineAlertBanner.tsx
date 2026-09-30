import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export const OfflineAlertBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showRestored) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      {isOffline ? (
        <div className="px-4 py-2.5 bg-rose-600/90 text-white border border-rose-400/80 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>No Internet Connection. All auction data is saved in local SQLite storage.</span>
        </div>
      ) : (
        <div className="px-4 py-2 bg-emerald-600/90 text-white border border-emerald-400/80 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Internet Restored! Real-time live auction sync active.</span>
        </div>
      )}
    </div>
  );
};
