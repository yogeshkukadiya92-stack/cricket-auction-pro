import { formatAuctionPrice } from '../utils/currency';
import React, { useState } from 'react';
import { Player, Team, AuctionRules } from '../types';
import { sounds } from '../soundEffects';
import { Hand, Wallet, Users, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TeamLogo, isImageLogo } from './TeamLogo';

interface TeamPaddleViewProps {
  allTeams: Team[];
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  allPlayers: Player[];
  rules: AuctionRules;
  onPlaceBid: (team: Team, amount: number) => void;
}

export const TeamPaddleView: React.FC<TeamPaddleViewProps> = ({
  allTeams,
  currentPlayer,
  currentBid,
  leadingTeam,
  allPlayers,
  rules,
  onPlaceBid,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(allTeams[0]?.id || '');
  const team = allTeams.find((t) => t.id === selectedTeamId) || allTeams[0];

  if (!team) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-4 my-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl text-amber-400">
          🛡️
        </div>
        <h3 className="text-xl font-bold text-white">No Teams Available</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Please create teams in the "Franchises" tab first so team paddles can be activated.
        </p>
      </div>
    );
  }

  const teamPlayers = allPlayers.filter((p) => p.soldToTeamId === team?.id);
  const slotsRemaining = rules.minPlayersPerTeam - teamPlayers.length;

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, rules.currency);
  };

  // Next Bid Calculation
  const nextBidAmount =
    currentBid === 0
      ? currentPlayer?.basePrice || 20000
      : currentBid + (rules.bidIncrement || currentPlayer?.basePrice || 20000);

  // Smart Max Bid Power:
  // Purse Left - (Slots Remaining - 1) * Avg Base Price
  const estimatedMinPerSlot = 20000;
  const maxSafeBid = Math.max(
    0,
    team.remainingPurse - Math.max(0, slotsRemaining - 1) * estimatedMinPerSlot
  );

  const canAffordNextBid = !!currentPlayer && ['AVAILABLE', 'IN_AUCTION'].includes(currentPlayer.status) && teamPlayers.length < rules.maxPlayersPerTeam && (rules.allowNegativePurse || team.remainingPurse >= nextBidAmount);
  const isCurrentlyLeading = leadingTeam?.id === team.id;

  const handlePaddlePress = () => {
    if (!canAffordNextBid || isCurrentlyLeading || !currentPlayer) return;
    sounds.playBidSound();
    onPlaceBid(team, nextBidAmount);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Franchise Switcher Dropdown */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Franchise Console:</span>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="bg-obsidian-900 border border-white/10 text-white font-bold text-sm px-4 py-2 rounded-xl focus:border-gold-400 focus:outline-none"
        >
          {allTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {isImageLogo(t.logo) ? '🛡️' : t.logo} {t.name} ({t.shortCode})
            </option>
          ))}
        </select>
      </div>

      {/* Team Purse & Squad Card */}
      <div
        className="p-6 rounded-3xl border relative overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: `${team.colorHex}15`,
          borderColor: `${team.colorHex}50`,
          boxShadow: `0 0 35px -5px ${team.colorHex}25`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 p-1.5 rounded-2xl bg-obsidian-950/80 border border-white/10 flex items-center justify-center shrink-0">
              <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-3xl" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-display">{team.name}</h3>
              <p className="text-xs text-slate-400">Owner: {team.ownerName}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200">
            RTM Cards: {team.rtmCardsLeft}
          </span>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-obsidian-950/70 border border-white/5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 mb-0.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Purse Left
            </div>
            <div className="text-lg font-black text-white">{formatPrice(team.remainingPurse)}</div>
          </div>

          <div className="p-3 rounded-2xl bg-obsidian-950/70 border border-white/5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 mb-0.5">
              <Users className="w-3.5 h-3.5 text-electric-cyan" />
              Squad Slots
            </div>
            <div className="text-lg font-black text-white">
              {teamPlayers.length} / {rules.maxPlayersPerTeam}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-obsidian-950/70 border border-white/5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              Max Safe Bid
            </div>
            <div className="text-lg font-black text-gold-400">{formatPrice(maxSafeBid)}</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Bidding Paddle */}
      {currentPlayer ? (
        <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <img
              src={currentPlayer.photoUrl || "/player-placeholder.svg"}
              alt={currentPlayer.name}
              className="w-16 h-16 rounded-2xl object-cover border border-white/10"
            />
            <div className="text-left">
              <span className="text-xs uppercase font-extrabold text-gold-400 tracking-wider">NOW BIDDING FOR</span>
              <h4 className="text-2xl font-black text-white font-display">{currentPlayer.name}</h4>
              <p className="text-xs text-slate-400">{currentPlayer.role} • Base {formatPrice(currentPlayer.basePrice)}</p>
            </div>
          </div>

          {/* Current Highest Leader Status */}
          <div className="p-3 rounded-2xl bg-obsidian-950/80 border border-white/5 flex items-center justify-between px-6">
            <span className="text-xs font-bold text-slate-400">Current Highest:</span>
            <span className="text-xl font-black text-white font-display">
              {currentBid > 0 ? formatPrice(currentBid) : 'None'}
              {leadingTeam && <span className="text-xs text-slate-400 font-normal ml-2">({leadingTeam.name})</span>}
            </span>
          </div>

          {/* Huge Touch Paddle Button */}
          {isCurrentlyLeading ? (
            <div className="py-8 rounded-3xl bg-emerald-500/10 border-2 border-emerald-400/50 flex flex-col items-center justify-center gap-2 shadow-glow-emerald">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse" />
              <span className="text-xl font-black text-emerald-400 font-display">YOU HOLD THE HIGHEST BID!</span>
              <span className="text-xs text-slate-400">Waiting for other franchises to counter or hammer sold.</span>
            </div>
          ) : (
            <button
              disabled={!canAffordNextBid}
              onClick={handlePaddlePress}
              className={`w-full py-10 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95 shadow-2xl ${
                canAffordNextBid
                  ? 'bg-gradient-to-r from-gold-500 via-amber-400 to-yellow-500 hover:from-gold-400 hover:to-amber-300 text-black shadow-glow-gold cursor-pointer'
                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Hand className="w-10 h-10 animate-bounce" />
              <span className="text-2xl font-black font-display tracking-tight">
                RAISE PADDLE • {formatPrice(nextBidAmount)}
              </span>
              <span className="text-xs font-semibold opacity-80">
                Tap to place instant official franchise bid
              </span>
            </button>
          )}

          {!canAffordNextBid && (
            <div className="flex items-center justify-center gap-2 text-xs text-red-400 font-medium">
              <AlertTriangle className="w-4 h-4" />
              Purse balance insufficient for this bid level.
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center rounded-3xl glass-panel border border-white/10 text-slate-400">
          Podium is empty. Waiting for Auctioneer to announce next player lot.
        </div>
      )}

      {/* Team's Current Squad List */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10">
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
          <span>Acquired Players ({teamPlayers.length})</span>
          <span className="text-gold-400 font-mono">
            Spent: {formatPrice(team.totalPurse - team.remainingPurse)}
          </span>
        </h4>

        {teamPlayers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No players bought yet. Get active on the paddle!</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {teamPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img src={player.photoUrl || "/player-placeholder.svg"} alt={player.name} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <span className="font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">{player.role}</span>
                  </div>
                </div>
                <span className="font-black text-emerald-400 font-mono">
                  {formatPrice(player.soldPrice || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
