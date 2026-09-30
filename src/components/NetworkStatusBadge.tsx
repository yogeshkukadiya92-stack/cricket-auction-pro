import React, { useState, useEffect } from 'react';
import { syncManager, NetworkHealth } from '../services/resilientSyncManager';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  X,
  Smartphone,
} from 'lucide-react';

export const NetworkStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<NetworkHealth>({
    tier: 'FAST',
    isOnline: true,
    rttMs: 40,
    pendingSyncCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((h) => {
      setHealth(h);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncManager.forceSyncNow();
    setTimeout(() => setIsManualSyncing(false), 800);
  };

  return (
    <>
      {/* Top Navbar Compact Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border shadow-sm backdrop-blur-md ${
          health.tier === 'FAST'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : health.tier === 'LOW_BANDWIDTH'
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
        }`}
        title="Network & Offline Database Status"
      >
        {health.isSyncing || isManualSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : health.tier === 'FAST' ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : health.tier === 'LOW_BANDWIDTH' ? (
          <Activity className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
        )}

        <span className="hidden sm:inline">
          {health.tier === 'FAST'
            ? 'Fast Online'
            : health.tier === 'LOW_BANDWIDTH'
            ? 'Low Internet'
            : 'Offline Mode'}
        </span>

        {health.pendingSyncCount > 0 && (
          <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full shadow">
            {health.pendingSyncCount}
          </span>
        )}
      </button>

      {/* Network & Local-First Database Diagnostic Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-obsidian-900 to-obsidian-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl ${
                    health.tier === 'FAST'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : health.tier === 'LOW_BANDWIDTH'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Resilient Local-First Database
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      IndexedDB + SQLite
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Continuous offline & low-bandwidth protection
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Network Health Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Network Tier */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 font-medium">Connection Tier</span>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      health.tier === 'FAST'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : health.tier === 'LOW_BANDWIDTH'
                        ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-rose-400 shadow-[0_0_8px_#f87171]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {health.tier === 'FAST'
                      ? 'Fast (4G/Wi-Fi)'
                      : health.tier === 'LOW_BANDWIDTH'
                      ? 'Low Internet (2G)'
                      : 'Offline (No Net)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Latency: {health.rttMs > 0 && health.rttMs < 9000 ? `${health.rttMs} ms` : 'N/A'}
                </div>
              </div>

              {/* Outbox Pending Changes */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 font-medium">Device Outbox Queue</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-base font-extrabold ${
                      health.pendingSyncCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {health.pendingSyncCount === 0 ? 'All Synced ✓' : `${health.pendingSyncCount} Pending`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {health.lastSyncedAt
                    ? `Last sync: ${health.lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Syncing automatically'}
                </div>
              </div>
            </div>

            {/* Low-Internet Architecture Highlights */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Zero-Loss Offline-First Guarantee
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                ઇન્ટરનેટ એકદમ ધીમું (2G) હોય કે તૂટક-તૂટક આવે તો પણ તમારી એપ <strong className="text-white">૧૦૦% ઝડપથી</strong> કામ કરશે. તમામ બોલી (Bids), પ્લેયર્સ અને ટૂર્નામેન્ટ તમારા ડિવાઇસના <strong className="text-emerald-300">IndexedDB</strong> માં તરત જ સેવ થઈ જાય છે અને નેટવર્ક મળતાં જ બેકગ્રાઉન્ડમાં સિંક થાય છે.
              </p>
            </div>

            {/* Sync Features List */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span><strong>Instant 0ms UI Updates:</strong> Instant local commits without network wait.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span><strong>Delta Syncing:</strong> Micro-payloads (~150 bytes) optimized for 2G networks.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span><strong>Auto-Compressed Photos:</strong> Photos compressed to ~30KB before upload.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleManualSync}
                disabled={isManualSyncing || health.isSyncing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isManualSyncing || health.isSyncing ? 'animate-spin' : ''}`}
                />
                {isManualSyncing || health.isSyncing ? 'Synchronizing...' : 'Sync Now with Server'}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
