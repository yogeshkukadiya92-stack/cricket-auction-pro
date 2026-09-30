import React, { useState } from 'react';
import { ViewMode, Tournament } from '../types';
import { sounds } from '../soundEffects';
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
} from 'lucide-react';

interface NavbarProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  tournament: Tournament;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  tournament,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

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
    { mode: 'STAGE' as ViewMode, label: 'Stage View', icon: Tv, highlight: true },
    { mode: 'AUCTIONEER' as ViewMode, label: 'Auctioneer Desk', icon: Mic },
    { mode: 'PADDLE' as ViewMode, label: 'Team Paddle', icon: Hand },
    { mode: 'PLAYERS' as ViewMode, label: 'Players', icon: Users },
    { mode: 'TEAMS' as ViewMode, label: 'Franchises', icon: Shield },
    { mode: 'SQUADS' as ViewMode, label: 'Squads', icon: FileSpreadsheet },
    { mode: 'OBS' as ViewMode, label: 'OBS Stream', icon: Radio },
    { mode: 'RULES' as ViewMode, label: 'Rules', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Tournament Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 p-0.5 shadow-glow-gold flex items-center justify-center">
            <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center text-lg">
              🏏
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white font-display tracking-tight leading-none">
                {tournament.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gold-500/20 text-gold-400 border border-gold-400/30">
                PRO 2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              {tournament.season} • Realtime Auction Engine
            </p>
          </div>
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

        {/* Utility Controls (Sound, Fullscreen) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-gold-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all hidden sm:block"
            title="Toggle Big Screen Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
