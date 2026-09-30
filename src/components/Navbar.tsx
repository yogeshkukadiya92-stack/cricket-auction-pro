import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, Tournament, User } from '../types';
import { sounds } from '../soundEffects';
import { TeamLogo } from './TeamLogo';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import {
  Tv,
  Mic,
  Hand,
  Users,
  Settings,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  Maximize2,
  Shield,
  Radio,
  ClipboardList,
  Trash2,
  Trophy,
  ChevronDown,
  Plus,
  Check,
  Layers,
  Database,
  User as UserIcon,
  LogOut,
  Sparkles,
  Eye,
} from 'lucide-react';

interface NavbarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  tournament: Tournament;
  tournaments?: Tournament[];
  onSelectTournament?: (id: string) => void;
  onCreateNewTournament?: () => void;
  onOpenDatabaseModal?: () => void;
  onEraseDemoData?: () => void;
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenFortuneWheel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  tournament,
  tournaments = [],
  onSelectTournament,
  onCreateNewTournament,
  onOpenDatabaseModal,
  onEraseDemoData,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenFortuneWheel,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const navItems = [
    { mode: 'TOURNAMENT_OVERVIEW' as ViewMode, label: 'Tournament Hub', icon: Trophy },
    { mode: 'STAGE' as ViewMode, label: 'Stage View', icon: Tv, highlight: true },
    { mode: 'AUCTIONEER' as ViewMode, label: 'Auctioneer Desk', icon: Mic },
    { mode: 'PADDLE' as ViewMode, label: 'Team Paddle', icon: Hand },
    { mode: 'PLAYERS' as ViewMode, label: 'Players', icon: Users },
    { mode: 'FORM_BUILDER' as ViewMode, label: 'Reg. Form', icon: ClipboardList },
    { mode: 'TEAMS' as ViewMode, label: 'Franchises', icon: Shield },
    { mode: 'SQUADS' as ViewMode, label: 'Squads', icon: FileSpreadsheet },
    { mode: 'PUBLIC_SUMMARY' as ViewMode, label: 'Live Spectator', icon: Eye },
    { mode: 'OBS' as ViewMode, label: 'OBS Stream', icon: Radio },
    { mode: 'RULES' as ViewMode, label: 'Rules', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Tournament Brand & Quick Switcher Dropdown */}
        <div className="relative" ref={switcherRef}>
          <button
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity p-1 -m-1 rounded-2xl group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 p-0.5 shadow-glow-gold flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center p-1 overflow-hidden">
                <TeamLogo logo={tournament.logoUrl || '🏆'} name={tournament.name} className="w-full h-full text-lg" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white font-display tracking-tight leading-none group-hover:text-gold-400 transition-colors">
                  {tournament.name}
                </h1>
                <ChevronDown className="w-3.5 h-3.5 text-gold-400 transition-transform group-hover:rotate-180" />
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gold-500/20 text-gold-400 border border-gold-400/30">
                  {tournament.year}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {tournament.season} • Switch Tournament
              </p>
            </div>
          </button>

          {/* Tournament Switcher Menu Modal */}
          {isSwitcherOpen && (
            <div className="absolute top-full left-0 mt-3 w-80 rounded-2xl bg-obsidian-900 border border-white/15 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Select Tournament</span>
                <span className="text-gold-400 font-mono text-[10px]">{tournaments.length} Created</span>
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {tournaments.map((t) => {
                  const isCurrent = t.id === tournament.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (onSelectTournament) onSelectTournament(t.id);
                        onSelectMode('TOURNAMENT_OVERVIEW');
                        setIsSwitcherOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                        isCurrent
                          ? 'bg-gold-500/15 border border-gold-400/40 text-white font-bold'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-obsidian-950 p-1 border border-white/10 shrink-0 flex items-center justify-center">
                          <TeamLogo logo={t.logoUrl || '🏆'} name={t.name} className="w-full h-full text-xs" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate">{t.name}</span>
                          <span className="text-[10px] text-slate-400">{t.season}</span>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-gold-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                {onCreateNewTournament && (
                  <button
                    onClick={() => {
                      setIsSwitcherOpen(false);
                      onCreateNewTournament();
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-gold-500 to-amber-400 text-black shadow-glow-gold hover:from-gold-400 hover:to-amber-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create New Tournament</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsSwitcherOpen(false);
                    onSelectMode('TOURNAMENTS');
                  }}
                  className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>View All Tournaments Hub</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher Pills */}
        <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-obsidian-950/80 border border-white/10 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => {
                  sounds.playTick();
                  onSelectMode(item.mode);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-black shadow-glow-gold font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Utility Controls (Live Sync, Erase Demo Data, Sound, Fullscreen, User / Auth) */}
        <div className="flex items-center gap-2">
          {/* Admin Panel Button (Exclusive to ADMIN role) */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => onSelectMode('ADMIN_PANEL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMode === 'ADMIN_PANEL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-glow-gold'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
              title="Super Administrator Control Panel"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* User Account / Sign In Pill */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-obsidian-950/80 border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {currentUser.name}
                </p>
                <span className="text-[9px] font-mono text-gold-400 leading-none block">
                  {currentUser.role}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition"
                  title="Log Out of Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 text-black text-xs font-bold hover:from-gold-400 hover:to-amber-300 shadow-glow-gold transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )
          )}

          {/* Interactive Fortune Wheel Launcher */}
          {onOpenFortuneWheel && (
            <button
              onClick={onOpenFortuneWheel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-md"
              title="Interactive Fortune Wheel (Lucky Draw)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Fortune Wheel</span>
            </button>
          )}

          {/* Dynamic Network & Local-First Database Status Badge */}
          <NetworkStatusBadge />

          {/* SQLite Database Status & Backup Launcher */}
          {onOpenDatabaseModal && (
            <button
              onClick={onOpenDatabaseModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-wider transition-colors cursor-pointer"
              title="PostgreSQL Database • Click for Backups & Storage Details"
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">POSTGRES DB</span>
            </button>
          )}

          {/* Erase All Demo Data Button */}
          {onEraseDemoData && (
            <button
              onClick={onEraseDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Erase All Demo Data and Start Fresh"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Erase Demo Data</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-gold-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all hidden sm:block cursor-pointer"
            title="Toggle Big Screen Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
