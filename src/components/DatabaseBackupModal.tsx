import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  X,
  ShieldCheck,
  Server,
  FileCode,
  HardDrive,
} from 'lucide-react';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentsCount: number;
  teamsCount: number;
  playersCount: number;
  onEraseDemoData?: () => void;
  onReloadData?: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  tournamentsCount,
  teamsCount,
  playersCount,
  onEraseDemoData,
  onReloadData,
}) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    const success = await dbService.exportBackup();
    setExporting(false);
    if (success) {
      setMessage({ text: '✅ Database backup downloaded successfully!', type: 'success' });
    } else {
      setMessage({ text: 'Failed to download backup', type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = await dbService.importBackup(json);
        setImporting(false);
        if (ok) {
          setMessage({ text: '🎉 Database restored successfully! Reloading...', type: 'success' });
          setTimeout(() => {
            if (onReloadData) onReloadData();
            window.location.reload();
          }, 1200);
        } else {
          setMessage({ text: 'Failed to restore: Invalid backup file format', type: 'error' });
        }
      } catch (err: any) {
        setImporting(false);
        setMessage({ text: `Invalid JSON file: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative max-w-lg w-full rounded-3xl p-6 sm:p-8 bg-obsidian-900 border border-white/10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-glow-emerald flex items-center justify-center">
              <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center text-xl text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-display">
                SQLITE DATABASE STORAGE
              </h3>
              <p className="text-xs text-slate-400">
                Native ACID persistent storage engine & auto-backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" />
              Engine Status:
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVE & CONNECTED
            </span>
          </div>

          <div className="text-xs text-slate-300 font-mono bg-obsidian-950 p-2.5 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-white font-bold">PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Disk File:</span>
              <span className="text-gold-400">database/cricket_auction.db</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Data Records:</span>
              <span className="text-emerald-400">
                {tournamentsCount} Tournaments • {teamsCount} Teams • {playersCount} Players
              </span>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Download Backup */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-glow-emerald flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating Backup...' : 'Download Full Database Backup (JSON)'}</span>
          </button>

          {/* Upload Backup */}
          <label className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-gold-400" />
            <span>{importing ? 'Restoring Database...' : 'Restore / Upload Backup File'}</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Erase All Demo Data */}
          {onEraseDemoData && (
            <button
              onClick={() => {
                onClose();
                onEraseDemoData();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Erase Demo Data & Reset DB</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          All changes are auto-saved to disk immediately. You can download the JSON backup anytime to transfer your tournament data between computers.
        </p>
      </div>
    </div>
  );
};
