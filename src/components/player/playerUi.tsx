import React, { useState } from 'react';
import { PlayerRole } from '../../types';
import { playerApi } from '../../services/playerApi';

export const ROLE_LABEL: Record<PlayerRole, string> = {
  BATSMAN: 'Batter',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKET_KEEPER: 'Wicket Keeper',
};

export const ROLE_ICON: Record<PlayerRole, string> = {
  BATSMAN: '🏏',
  BOWLER: '🎯',
  ALL_ROUNDER: '⚡',
  WICKET_KEEPER: '🧤',
};

export const ROLE_GRADIENT: Record<PlayerRole, string> = {
  BATSMAN: 'from-amber-400 to-orange-600',
  BOWLER: 'from-cyan-400 to-blue-600',
  ALL_ROUNDER: 'from-violet-400 to-fuchsia-600',
  WICKET_KEEPER: 'from-emerald-400 to-teal-600',
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

interface PlayerAvatarProps {
  id: string | null;
  name: string;
  role: PlayerRole;
  hasPhoto: boolean;
  className?: string;
  textClass?: string;
  ring?: boolean;
}

/** Player photo streamed from the API (cached), with a role-tinted initials fallback. */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ id, name, role, hasPhoto, className = 'w-14 h-14', textClass = 'text-lg', ring = false }) => {
  const [failed, setFailed] = useState(false);
  const showPhoto = hasPhoto && !!id && !failed;
  return (
    <div className={`relative shrink-0 rounded-2xl overflow-hidden ${className} ${ring ? 'ring-2 ring-gold-400/60 shadow-glow-gold' : 'ring-1 ring-white/10'}`}>
      {showPhoto ? (
        <img src={playerApi.photoUrl(id)} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full grid place-items-center bg-gradient-to-br ${ROLE_GRADIENT[role]} text-white font-display font-black`}>
          <span className={`${textClass} leading-none drop-shadow`}>{initials(name)}</span>
        </div>
      )}
    </div>
  );
};

export const LiveDot: React.FC<{ label?: string }> = ({ label = 'LIVE' }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/40 px-2.5 py-1 text-[10px] font-black tracking-widest text-red-300">
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
    {label}
  </span>
);

export const StatPill: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent = 'text-white' }) => (
  <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-center">
    <div className={`font-display text-lg font-black leading-tight ${accent}`}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">{label}</div>
  </div>
);

export const EmptyState: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="glass-panel rounded-3xl px-6 py-12 text-center">
    <div className="text-5xl mb-4 animate-float">{icon}</div>
    <h3 className="font-display text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">{text}</p>
  </div>
);
