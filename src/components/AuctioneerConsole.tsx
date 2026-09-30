import React, { useState } from 'react';
import { Player, Team, AuctionRules } from '../types';
import { sounds } from '../soundEffects';
import { Gavel, Undo2, Ban, ChevronRight, Shuffle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface AuctioneerConsoleProps {
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  allTeams: Team[];
  allPlayers: Player[];
  rules: AuctionRules;
  onPlaceBid: (team: Team, newAmount: number) => void;
  onSold: () => void;
  onUnsold: () => void;
  onUndoBid: () => void;
  onSelectPlayer: (player: Player) => void;
  onRandomDraw: () => void;
}

export const AuctioneerConsole: React.FC<AuctioneerConsoleProps> = ({
  currentPlayer,
  currentBid,
  leadingTeam,
  allTeams,
  allPlayers,
  rules,
  onPlaceBid,
  onSold,
  onUnsold,
  onUndoBid,
  onSelectPlayer,
  onRandomDraw,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(allTeams[0]?.id || '');
  const [customInc, setCustomInc] = useState<number>(10000);

  const selectedTeam = allTeams.find((t) => t.id === selectedTeamId) || allTeams[0];

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getNextBidOptions = () => {
    const base = currentBid === 0 && currentPlayer ? currentPlayer.basePrice : currentBid;
    return [
      { label: '+2k', val: base + 2000 },
      { label: '+5k', val: base + 5000 },
      { label: '+10k', val: base + 10000 },
      { label: '+25k', val: base + 25000 },
      { label: '+50k', val: base + 50000 },
    ];
  };

  const handleBidStep = (targetAmount: number) => {
    if (!selectedTeam || !currentPlayer) return;
    if (targetAmount > selectedTeam.remainingPurse) {
      alert(`⚠️ ${selectedTeam.name} does not have enough purse! (${formatPrice(selectedTeam.remainingPurse)})`);
      return;
    }
    sounds.playBidSound();
    onPlaceBid(selectedTeam, targetAmount);
  };

  const availablePlayers = allPlayers.filter((p) => p.status === 'AVAILABLE' || p.status === 'IN_AUCTION');

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-white/10">
        <div>
          <h2 className="text-xl font-black text-white font-display flex items-center gap-2">
            🎙️ AUCTIONEER COMMAND DESK
          </h2>
          <p className="text-xs text-slate-400">
            Current Lot: #{currentPlayer?.lotOrder || 0} • {currentPlayer?.name || 'No Player Active'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRandomDraw}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-95"
          >
            <Shuffle className="w-4 h-4 text-gold-400" />
            Random Draw
          </button>
          <div className="flex items-center gap-1.5 bg-obsidian-900 border border-white/10 p-1 rounded-xl">
            <span className="text-xs font-bold text-slate-400 px-2">Jump to:</span>
            <select
              value={currentPlayer?.id || ''}
              onChange={(e) => {
                const found = allPlayers.find((p) => p.id === e.target.value);
                if (found) onSelectPlayer(found);
              }}
              className="bg-obsidian-850 text-xs font-semibold text-white px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-gold-400"
            >
              {allPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  Lot #{p.lotOrder} - {p.name} ({p.role} - {p.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {currentPlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Team Selector & Quick Bids */}
          <div className="lg:col-span-8 space-y-5">
            {/* Step 1: Select Bidding Team */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                1. Select Bidding Franchise (Paddle)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {allTeams.map((team) => {
                  const isSelected = selectedTeam.id === team.id;
                  const isLeading = leadingTeam?.id === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        sounds.playTick();
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-gold-400 bg-gold-500/15 shadow-glow-gold'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      {isLeading && (
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-black shadow">
                          HIGHEST
                        </span>
                      )}
                      <div className="text-2xl mb-1">{team.logo}</div>
                      <div className="text-sm font-extrabold text-white truncate">{team.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Purse: {formatPrice(team.remainingPurse)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Place Next Bid */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Raise Bid for {selectedTeam.name}
                </span>
                <span className="text-xs font-bold text-gold-400">
                  Current: {currentBid > 0 ? formatPrice(currentBid) : `Base ${formatPrice(currentPlayer.basePrice)}`}
                </span>
              </div>

              {/* Fast Increment Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {getNextBidOptions().map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => handleBidStep(opt.val)}
                    className="group p-3 rounded-xl bg-gradient-to-b from-white/10 to-white/5 hover:from-gold-500/30 hover:to-gold-500/10 border border-white/10 hover:border-gold-400/50 text-center transition-all active:scale-95 shadow-lg"
                  >
                    <span className="block text-xs font-bold text-slate-400 group-hover:text-gold-300">
                      {opt.label}
                    </span>
                    <span className="text-base font-black text-white group-hover:text-gold-400 font-display">
                      {formatPrice(opt.val)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Bid Input */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">Custom Bid:</span>
                <input
                  type="number"
                  step="5000"
                  value={customInc}
                  onChange={(e) => setCustomInc(Number(e.target.value))}
                  className="bg-obsidian-900 border border-white/10 px-3 py-1.5 rounded-xl text-sm font-bold text-white w-36 focus:border-gold-400 focus:outline-none"
                  placeholder="Amount"
                />
                <button
                  onClick={() => handleBidStep(customInc)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gold-500 hover:bg-gold-400 text-black flex items-center gap-1.5 active:scale-95 transition-all shadow-glow-gold"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Place {formatPrice(customInc)}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Hammer / Sold / Unsold Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                3. Final Hammer Decision
              </span>

              {/* Big SOLD Button */}
              <button
                disabled={!leadingTeam || currentBid === 0}
                onClick={() => {
                  sounds.playGavel();
                  onSold();
                }}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-2xl transition-all ${
                  leadingTeam && currentBid > 0
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-glow-emerald cursor-pointer active:scale-95'
                    : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-5 h-5" />
                HAMMER SOLD! ({leadingTeam?.shortCode || 'None'})
              </button>

              {/* UNSOLD Button */}
              <button
                onClick={() => {
                  sounds.playUnsoldBuzzer();
                  onUnsold();
                }}
                className="w-full py-3 rounded-xl font-bold text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Ban className="w-4 h-4" />
                Mark UNSOLD (To Accelerated Round)
              </button>

              {/* UNDO Last Bid */}
              <button
                onClick={onUndoBid}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Undo2 className="w-4 h-4 text-gold-400" />
                Undo Previous Bid (Rollback)
              </button>
            </div>

            {/* Quick Player Profile Snapshot */}
            <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Active Player Info</span>
              <div className="flex items-center gap-3">
                <img
                  src={currentPlayer.photoUrl}
                  alt={currentPlayer.name}
                  className="w-12 h-12 rounded-xl object-cover border border-white/10"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">{currentPlayer.name}</h4>
                  <p className="text-xs text-gold-400">{currentPlayer.role} • {currentPlayer.category}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl glass-panel border border-white/10">
          <p className="text-slate-400 mb-4">No player is currently on the auction block.</p>
          <button
            onClick={onRandomDraw}
            className="px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-extrabold text-sm shadow-glow-gold active:scale-95"
          >
            Call First Player to Block
          </button>
        </div>
      )}
    </div>
  );
};
