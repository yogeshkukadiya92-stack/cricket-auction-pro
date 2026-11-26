import React, { useState, useRef } from 'react';
import { Player } from '../types';
import { Shield, Sparkles, Award, Zap } from 'lucide-react';

interface PlayerCard3DProps {
  player: Player;
  isBigStage?: boolean;
  showUnsold?: boolean;
}

export const PlayerCard3D: React.FC<PlayerCard3DProps> = ({ player, isBigStage = false, showUnsold = false }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const isMarquee = player.category === 'MARQUEE';

  const getRoleBadge = () => {
    switch (player.role) {
      case 'BATSMAN':
        return { label: 'Batsman', color: 'bg-obsidian-950/85', icon: Zap };
      case 'BOWLER':
        return { label: 'Bowler', color: 'bg-obsidian-950/85', icon: Shield };
      case 'ALL_ROUNDER':
        return { label: 'All-rounder', color: 'bg-obsidian-950/85', icon: Sparkles };
      case 'WICKET_KEEPER':
        return { label: 'Keeper', color: 'bg-obsidian-950/85', icon: Award };
    }
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  return (
    <div
      className={`perspective-1000 w-full flex justify-center py-2 select-none ${isBigStage ? 'stage-card-wrap' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className={`relative rounded-3xl transition-transform duration-150 ease-out preserve-3d overflow-hidden flex flex-col ${
          isBigStage ? 'stage-card w-full max-w-[400px] h-[min(500px,62vh)] min-h-[420px]' : 'w-full max-w-[340px] h-[480px]'
        } ${
          isMarquee
            ? 'border-2 border-gold-400/80 shadow-glow-gold'
            : 'border border-white/10 shadow-glass'
        } bg-gradient-to-b from-obsidian-850 via-obsidian-900 to-obsidian-950`}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
      >
        {/* Holographic Specular Glare Reflection */}
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.45) 0%, transparent 65%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Top Floating Badge Bar */}
        <div className="relative z-20 shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1.5 ${roleInfo.color}`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              {roleInfo.label}
            </span>
            {isMarquee && (
              <span className="px-2.5 py-1 rounded-full caption text-[11px] font-extrabold bg-gold-500/20 text-gold-400 border border-gold-400/40 flex items-center gap-1 animate-pulse">
                ★ Marquee
              </span>
            )}
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-obsidian-950/80 backdrop-blur-md border border-white/10 text-slate-300">
            #{player.lotOrder}
          </div>
        </div>

        {/* Player Portrait Container - Full & Clear Visibility */}
        <div className="relative flex-1 min-h-0 mx-3 overflow-hidden rounded-2xl border border-white/15 bg-obsidian-950 shadow-inner">
          <img
            aria-hidden="true"
            src={player.photoUrl || "/player-placeholder.svg"}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40"
          />
          <img
            src={player.photoUrl || "/player-placeholder.svg"}
            alt={player.name}
            className="relative w-full h-full object-contain"
            loading="lazy"
          />
          {showUnsold && (
            <div role="status" className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/35">
              <span className="cap-stamp rounded-xl border-4 border-red-500 bg-black/75 px-4 py-1 font-display text-4xl font-black text-red-400">UNSOLD</span>
            </div>
          )}
        </div>

        {/* Player Details & Key Stats Floating Glassmorphic Card */}
        <div className="relative shrink-0 p-3 z-20">
          <div className="p-3 rounded-2xl bg-obsidian-950/85 border border-white/10 shadow-2xl space-y-2">
            <div className="space-y-0.5">
              <h3 className="text-3xl sm:text-4xl font-extrabold leading-tight text-white font-display truncate">
                {player.name}
              </h3>
              <p className="caption text-[11px] sm:text-xs text-slate-300 font-medium flex items-center gap-1.5 truncate">
                <span className="text-gold-400 font-bold">{player.battingStyle}</span>
                {player.bowlingStyle && player.bowlingStyle !== 'N/A' && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{player.bowlingStyle}</span>
                  </>
                )}
              </p>
            </div>

            {/* Quick Stats Pill Grid */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block caption text-[11px] font-bold text-slate-400">Matches</span>
                <span className="text-xs sm:text-sm font-black text-white">{player.stats.matches}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block caption text-[11px] font-bold text-slate-400">Runs</span>
                <span className="text-xs sm:text-sm font-black text-white">{player.stats.runs}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block caption text-[11px] font-bold text-slate-400">Wickets</span>
                <span className="text-xs sm:text-sm font-black text-white">{player.stats.wickets}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block caption text-[11px] font-bold text-slate-400">
                  {player.stats.strikeRate ? 'S.R.' : 'Econ'}
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {player.stats.strikeRate || player.stats.economy || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
