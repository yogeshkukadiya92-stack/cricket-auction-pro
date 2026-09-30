import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Activity, CheckCircle2 } from 'lucide-react';
import { syncManager, NetworkHealth } from '../services/resilientSyncManager';

export const OfflineAlertBanner: React.FC = () => {
  const [health, setHealth] = useState<NetworkHealth>({
    tier: 'FAST',
    isOnline: true,
    rttMs: 40,
    pendingSyncCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  });

  const [dismissLowNet, setDismissLowNet] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((h) => {
      if (!h.isOnline) {
        setWasOffline(true);
      } else if (wasOffline && h.isOnline) {
        setWasOffline(false);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3500);
      }
      setHealth(h);
    });

    return () => unsubscribe();
  }, [wasOffline]);

  if (health.isOnline && health.tier === 'FAST' && !showRestored) return null;
  if (health.tier === 'LOW_BANDWIDTH' && dismissLowNet && !showRestored) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all pointer-events-auto">
      {/* 1. Offline Banner */}
      {!health.isOnline ? (
        <div className="px-4 py-2 bg-rose-600/95 text-white border border-rose-400/80 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Mode: Working 100% from Local IndexedDB. Changes saved on this device.</span>
          {health.pendingSyncCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[11px]">
              {health.pendingSyncCount} pending
            </span>
          )}
        </div>
      ) : showRestored ? (
        /* 2. Restored Banner */
        <div className="px-4 py-2 bg-emerald-600/95 text-white border border-emerald-400/80 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Internet Restored! Local-First database synchronized.</span>
        </div>
      ) : health.tier === 'LOW_BANDWIDTH' && !dismissLowNet ? (
        /* 3. Low Internet Banner */
        <div className="px-4 py-2 bg-amber-500/95 text-slate-950 border border-amber-300 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-fade-in">
          <Activity className="w-4 h-4 shrink-0 text-slate-950" />
          <span>Low Internet (2G/Slow): Local-First Mode active. Zero delay on bids & updates.</span>
          <button
            onClick={() => setDismissLowNet(true)}
            className="ml-2 px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/30 text-[10px] text-slate-900 transition-colors"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
};
