import React, { useState, useRef } from 'react';
import { Player } from '../types';
import { Shield, Sparkles, Award, Zap } from 'lucide-react';

interface PlayerCard3DProps {
  player: Player;
  isBigStage?: boolean;
}

export const PlayerCard3D: React.FC<PlayerCard3DProps> = ({ player, isBigStage = false }) => {
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
        return { label: 'Top Batsman', color: 'from-amber-500 to-orange-600', icon: Zap };
      case 'BOWLER':
        return { label: 'Strike Bowler', color: 'from-blue-500 to-indigo-600', icon: Shield };
      case 'ALL_ROUNDER':
        return { label: 'All-Rounder', color: 'from-emerald-500 to-teal-600', icon: Sparkles };
      case 'WICKET_KEEPER':
        return { label: 'Wicket Keeper', color: 'from-purple-500 to-pink-600', icon: Award };
    }
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  return (
    <div
      className="perspective-1000 w-full flex justify-center py-2 select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className={`relative rounded-3xl transition-transform duration-150 ease-out preserve-3d overflow-hidden ${
          isBigStage ? 'w-full max-w-[440px] h-[600px]' : 'w-full max-w-[340px] h-[480px]'
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
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-1.5 bg-gradient-to-r ${roleInfo.color}`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              {roleInfo.label}
            </span>
            {isMarquee && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gold-500/20 text-gold-400 border border-gold-400/40 flex items-center gap-1 animate-pulse">
                ★ MARQUEE
              </span>
            )}
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-obsidian-950/80 backdrop-blur-md border border-white/10 text-slate-300">
            LOT #{player.lotOrder}
          </div>
        </div>

        {/* Player Portrait Container - Full & Clear Visibility */}
        <div className="relative w-full h-[78%] overflow-hidden bg-gradient-to-b from-obsidian-900 to-obsidian-950">
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-full h-full object-cover object-top sm:object-center transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          {/* Subtle bottom edge blend only (No heavy dark overlays) */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-obsidian-950 via-obsidian-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Player Details & Key Stats Floating Glassmorphic Card */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 z-20 flex flex-col justify-end">
          <div className="p-3.5 rounded-2xl bg-obsidian-950/85 backdrop-blur-xl border border-white/10 shadow-2xl space-y-2">
            <div className="space-y-0.5">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-display truncate">
                {player.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium flex items-center gap-1.5 truncate">
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
                <span className="block text-[9px] uppercase font-bold text-slate-400">Matches</span>
                <span className="text-xs sm:text-sm font-black text-white">{player.stats.matches}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Runs</span>
                <span className="text-xs sm:text-sm font-black text-gold-400">{player.stats.runs}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Wickets</span>
                <span className="text-xs sm:text-sm font-black text-electric-cyan">{player.stats.wickets}</span>
              </div>
              <div className="text-center p-1 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">
                  {player.stats.strikeRate ? 'S.R.' : 'Econ'}
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-400">
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
