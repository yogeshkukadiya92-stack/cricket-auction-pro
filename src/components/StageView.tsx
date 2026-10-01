import { formatAuctionPrice } from '../utils/currency';
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, Team, BidRecord } from '../types';
import { PlayerCard3D } from './PlayerCard3D';
import { sounds } from '../soundEffects';
import { Timer, TrendingUp, DollarSign, Award, Flame, UserCheck, ShieldAlert } from 'lucide-react';
import { TeamLogo } from './TeamLogo';

interface StageViewProps {
  tournamentName?: string;
  tournamentId?: string;
  timerSeconds?: number;
  currency?: import('../types').CurrencyType;
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  bidsHistory: BidRecord[];
  allTeams: Team[];
  isSold: boolean;
  isUnsold: boolean;
  lastSoldInfo: { player: Player; team: Team; price: number } | null;
  onNextPlayer?: () => void;
}

export const StageView: React.FC<StageViewProps> = ({
  tournamentName = "Live Auction",
  tournamentId,
  timerSeconds = 15,
  currency = 'INR',
  currentPlayer,
  currentBid,
  leadingTeam,
  bidsHistory,
  allTeams,
  isSold,
  isUnsold,
  lastSoldInfo,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const shareLive = async () => {
    try {
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set("mode", "summary");
      url.searchParams.set("tournamentId", tournamentId || "");
      await navigator.clipboard.writeText(url.toString());
      setLinkCopied(true); setShareError(false);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch { setShareError(true); }
  };
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => { setTimeLeft(timerSeconds); setIsTimerRunning(false); }, [currentPlayer?.id, timerSeconds]);

  // Trigger countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 4 && prev > 1) {
            sounds.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  // When a new bid arrives, reset timer to 12s
  useEffect(() => {
    if (currentBid > 0 && !isSold && !isUnsold) {
      setTimeLeft(timerSeconds);
      setIsTimerRunning(true);
    }
  }, [currentBid, isSold, isUnsold]);

  // Trigger celebration on SOLD
  useEffect(() => {
    if (isSold && lastSoldInfo) {
      sounds.playSoldFanfare();
      // Blast Confetti
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#FFFFFF'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#FFFFFF'],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isSold, lastSoldInfo]);

  const displayPlayer = isSold && lastSoldInfo ? lastSoldInfo.player : currentPlayer;

  if (!displayPlayer) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center p-8 glass-panel rounded-3xl border border-white/10 relative overflow-hidden stadium-beam">
        <div className="w-24 h-24 rounded-3xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center mb-6 shadow-glow-gold animate-bounce">
          <Award className="w-12 h-12 text-gold-400" />
        </div>
        <span className="px-3.5 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gold-500/20 text-gold-400 border border-gold-400/30 mb-3">
          ● MEGA AUCTION ARENA LIVE
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-white font-display mb-3">
          AUCTION STAGE READY
        </h2>
        <p className="text-slate-300 max-w-lg text-sm sm:text-base leading-relaxed">
          To begin bidding, summon a player to the podium from the <strong>Auctioneer Desk</strong> (use Random Draw or select a player).
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time Broadcast & Multi-Device Sync Active</span>
        </div>
      </div>
    );
  }

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, currency);
  };

  return (
    <div className="auction-stage relative w-full overflow-hidden rounded-3xl border border-white/10 glass-panel shadow-2xl p-6 lg:p-10 stadium-beam">
      {tournamentId && <div className="stage-share mb-4 flex justify-end">
        <button onClick={shareLive} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold">{linkCopied ? 'Link copied!' : shareError ? 'Copy failed — try again' : 'Copy Live Spectator Link'}</button>
      </div>}
      {/* Top Banner Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
            LIVE AUCTION
          </span>
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
            {tournamentName}
          </span>
        </div>

        {/* 15s Countdown Box */}
        <div className="flex items-center gap-3 bg-obsidian-950/80 px-4 py-2 rounded-2xl border border-white/10">
          <Timer className={`w-5 h-5 ${timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-gold-400'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Countdown</span>
            <span className={`text-xl font-black font-display ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stage Grid */}
      <div className="stage-grid grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8">
        {/* Left Column: 3D Player Card */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <PlayerCard3D player={displayPlayer} isBigStage={true} />
        </div>

        {/* Right Column: Bidding Action & Status */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Current Live Bid Display */}
          <div className="relative overflow-hidden rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-obsidian-950 border border-white/10 shadow-2xl">
            {/* Ambient Back Glow */}
            <div
              className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: leadingTeam?.colorHex || '#F59E0B' }}
            />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-gold-400" />
                CURRENT HIGHEST BID
              </span>
              <span className="text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                Base: {formatPrice(displayPlayer.basePrice)}
              </span>
            </div>

            {/* Huge Price Number */}
            <div className="flex items-baseline gap-3 my-2">
              <span className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-yellow-500 font-display tracking-tight drop-shadow-md">
                {formatPrice(currentBid)}
              </span>
            </div>

            {/* Leading Team Banner */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                HELD BY FRANCHISE:
              </span>
              {leadingTeam ? (
                <div
                  className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300"
                  style={{
                    backgroundColor: `${leadingTeam.colorHex}15`,
                    borderColor: `${leadingTeam.colorHex}50`,
                    boxShadow: `0 0 30px -5px ${leadingTeam.colorHex}30`,
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 p-1.5 rounded-xl bg-obsidian-950/80 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                      <TeamLogo logo={leadingTeam.logo} name={leadingTeam.name} className="w-full h-full text-4xl" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white font-display flex items-center gap-2">
                        {leadingTeam.name}
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white/10 text-slate-300">
                          {leadingTeam.shortCode}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        Owner: {leadingTeam.ownerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Purse Left</span>
                    <span className="text-sm font-bold text-slate-200">
                      {formatPrice(leadingTeam.remainingPurse)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-400">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                  <span className="text-sm font-medium">
                    Awaiting opening bid at {formatPrice(displayPlayer.basePrice)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Bidding History Log */}
          <div className="rounded-2xl p-4 bg-obsidian-900/60 border border-white/5">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Recent Bidding War</span>
              <span className="text-gold-400">{bidsHistory.length} Bids Logged</span>
            </div>
            {bidsHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">No bids placed yet in this lot.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {bidsHistory.slice(0, 4).map((bid, idx) => (
                  <div
                    key={bid.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${
                      idx === 0
                        ? 'bg-gold-500/10 border border-gold-500/30 text-white font-bold'
                        : 'bg-white/[0.02] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                        #{bidsHistory.length - idx}
                      </span>
                      <span>{bid.teamName}</span>
                    </div>
                    <span className={idx === 0 ? 'text-gold-400 font-extrabold text-sm' : 'text-slate-300'}>
                      {formatPrice(bid.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Franchise Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {allTeams.map((team) => (
              <div
                key={team.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  leadingTeam?.id === team.id
                    ? 'border-gold-400 bg-gold-500/10 shadow-glow-gold'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center overflow-hidden">
                  <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-xl" />
                </div>
                <div className="text-xs font-bold text-white truncate">{team.shortCode}</div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {formatPrice(team.remainingPurse)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOLD Celebration Modal Overlay */}
      {isSold && lastSoldInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative max-w-lg w-full rounded-3xl p-8 bg-gradient-to-b from-obsidian-850 via-obsidian-900 to-obsidian-950 border-2 border-emerald-500/80 shadow-glow-emerald text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/40 mx-auto flex items-center justify-center text-4xl mb-4 animate-bounce">
              🎉
            </div>
            <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              OFFICIALLY SOLD!
            </span>
            <h2 className="text-3xl font-black text-white font-display mt-3">
              {lastSoldInfo.player.name}
            </h2>
            <div className="my-5 p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center gap-3">
              <div className="w-14 h-14 p-1.5 rounded-xl bg-obsidian-950/80 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                <TeamLogo logo={lastSoldInfo.team.logo} name={lastSoldInfo.team.name} className="w-full h-full text-3xl" />
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Bought by</span>
                <span className="text-xl font-black text-white">{lastSoldInfo.team.name}</span>
              </div>
            </div>
            <div className="text-4xl font-black text-emerald-400 font-display">
              {formatPrice(lastSoldInfo.price)}
            </div>
          </div>
        </div>
      )}

      {/* UNSOLD Modal Overlay */}
      {isUnsold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full rounded-3xl p-8 bg-obsidian-900 border-2 border-red-500/80 shadow-2xl text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white font-display">PLAYER UNSOLD</h2>
            <p className="text-slate-400 text-sm mt-2">
              {displayPlayer.name} received no opening bids. Moving to Accelerated Round queue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
