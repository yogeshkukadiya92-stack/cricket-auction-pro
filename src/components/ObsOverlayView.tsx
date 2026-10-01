import { formatAuctionPrice } from '../utils/currency';
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, Team, BidRecord } from '../types';
import { Timer, Flame, CheckCircle2 } from 'lucide-react';
import { TeamLogo, isImageLogo } from './TeamLogo';

interface ObsOverlayViewProps {
  timerSeconds?: number;
  currency?: import('../types').CurrencyType;
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  bidsHistory: BidRecord[];
  isSold: boolean;
  isUnsold: boolean;
  lastSoldInfo: { player: Player; team: Team; price: number } | null;
}

export const ObsOverlayView: React.FC<ObsOverlayViewProps> = ({
  timerSeconds = 15,
  currency = 'INR',
  currentPlayer,
  currentBid,
  leadingTeam,
  isSold,
  isUnsold,
  lastSoldInfo,
}) => {
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timeLeft > 0 && !isSold && !isUnsold) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft, isSold, isUnsold]);

  useEffect(() => {
    if (currentBid > 0) {
      setTimeLeft(timerSeconds);
    }
  }, [currentBid]);

  useEffect(() => { setTimeLeft(timerSeconds); }, [currentPlayer?.id, timerSeconds]);

  // Confetti trigger
  useEffect(() => {
    if (isSold && lastSoldInfo) {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.8 },
      });
    }
  }, [isSold, lastSoldInfo]);

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, currency);
  };

  const displayPlayer = isSold && lastSoldInfo ? lastSoldInfo.player : currentPlayer;

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-end p-6 select-none bg-transparent">
      {/* OBS Instructions Banner (hidden during clean stream or click to dismiss) */}
      <div className="absolute top-4 left-4 bg-black/80 text-white text-[11px] p-2 rounded-lg border border-white/10 pointer-events-auto max-w-sm">
        <span className="font-bold text-gold-400">OBS BROWSER SOURCE MODE:</span> Background is 100% transparent. Add this URL in OBS Studio as a Browser Source (1920x1080) for lower-third TV broadcast overlay.
      </div>

      {/* Main Broadcast Lower-Third Ticker */}
      {displayPlayer && (
        <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-400/50 bg-gradient-to-r from-obsidian-950 via-obsidian-900 to-obsidian-950 p-4 lg:p-6 backdrop-blur-2xl">
          {/* Top Mini Bar */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs font-bold">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white uppercase text-[10px] font-black tracking-wider animate-pulse">
                ● LIVE AUCTION
              </span>
              <span className="text-slate-300">
                LOT #{displayPlayer.lotOrder} • {displayPlayer.role} • Base {formatPrice(displayPlayer.basePrice)}
              </span>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono">
              <Timer className="w-3.5 h-3.5 text-gold-400" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Lower Third Main Row */}
          <div className="flex items-center justify-between gap-6">
            {/* Player Info */}
            <div className="flex items-center gap-4">
              <img
                src={displayPlayer.photoUrl || "/player-placeholder.svg"}
                alt={displayPlayer.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              />
              <div>
                <h3 className="text-2xl font-black text-white font-display tracking-tight">
                  {displayPlayer.name}
                </h3>
                <p className="text-xs text-gold-400 font-semibold mt-0.5">
                  {displayPlayer.battingStyle}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Runs: <strong className="text-white">{displayPlayer.stats.runs}</strong></span>
                  <span>Wkts: <strong className="text-electric-cyan">{displayPlayer.stats.wickets}</strong></span>
                  <span>SR: <strong className="text-emerald-400">{displayPlayer.stats.strikeRate}</strong></span>
                </div>
              </div>
            </div>

            {/* Center: Live Bidding Amount with Pulse */}
            <div className="text-center px-6 py-2 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-gold-400" />
                HIGHEST BID
              </span>
              <span className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-yellow-500 font-display">
                {currentBid > 0 ? formatPrice(currentBid) : formatPrice(displayPlayer.basePrice)}
              </span>
            </div>

            {/* Right: Leading Franchise */}
            <div className="text-right min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                HELD BY
              </span>
              {leadingTeam ? (
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <h4 className="text-lg font-black text-white font-display">{leadingTeam.name}</h4>
                    <span className="text-xs text-slate-400 font-medium">{leadingTeam.ownerName}</span>
                  </div>
                  <div className="w-12 h-12 p-1.5 rounded-xl bg-obsidian-950 border border-white/10 flex items-center justify-center shrink-0">
                    <TeamLogo logo={leadingTeam.logo} name={leadingTeam.name} className="w-full h-full text-2xl" />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-medium italic">Opening bid awaited...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOLD Celebration Overlay for Stream */}
      {isSold && lastSoldInfo && (
        <div className="fixed inset-x-0 bottom-24 flex justify-center z-50 animate-in slide-in-from-bottom duration-300">
          <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border-4 border-white shadow-2xl text-center text-white max-w-xl w-full">
            <span className="text-xs uppercase font-black tracking-widest bg-black/40 px-4 py-1 rounded-full">
              OFFICIALLY SOLD!
            </span>
            <h2 className="text-3xl font-black font-display mt-2">{lastSoldInfo.player.name}</h2>
            <div className="text-xl font-bold mt-2 flex items-center justify-center gap-2 flex-wrap">
              <span>BOUGHT BY</span>
              <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/20 p-1 inline-flex items-center justify-center">
                <TeamLogo logo={lastSoldInfo.team.logo} name={lastSoldInfo.team.name} className="w-full h-full text-base" />
              </div>
              <span className="tracking-wide">{lastSoldInfo.team.name.toUpperCase()}</span>
              <span>FOR</span>
              <span className="text-gold-300 font-mono font-black">{formatPrice(lastSoldInfo.price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
