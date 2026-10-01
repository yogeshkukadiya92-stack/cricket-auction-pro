import { formatAuctionPrice } from '../utils/currency';
import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  TrendingUp,
  Activity,
  Share2,
  Check,
  Shield,
  Layers,
  Sparkles,
  Award,
  ExternalLink,
  Flame,
  Clock,
} from 'lucide-react';
import { Tournament, Team, Player, BidRecord } from '../types';
import { TeamLogo } from './TeamLogo';
import { getBidBudget } from '../../shared/auctionBudget.js';

interface PublicSpectatorViewProps {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  registrationStats?: { total: number; pending: number; approved: number; rejected: number };
  currentPlayer?: Player | null;
  currentBid?: number;
  leadingTeam?: Team | null;
  bidsHistory?: BidRecord[];
  onExitSpectatorMode?: () => void;
}

export const PublicSpectatorView: React.FC<PublicSpectatorViewProps> = ({
  tournament,
  teams,
  players,
  currentPlayer,
  registrationStats,
  currentBid = 0,
  leadingTeam,
  bidsHistory = [],
  onExitSpectatorMode,
}) => {
  const [selectedTeamTab, setSelectedTeamTab] = useState<string>(teams[0]?.id || '');
  const [shareError, setShareError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync selectedTeamTab if teams change
  useEffect(() => {
    if (!teams.some(t => t.id === selectedTeamTab) && teams.length > 0) {
      setSelectedTeamTab(teams[0].id);
    }
  }, [teams, selectedTeamTab]);

  const soldPlayers = players.filter((p) => p.status === 'SOLD');
  const unsoldPlayers = players.filter((p) => p.status === 'UNSOLD');
  const availablePlayers = players.filter((p) => (!p.approvalStatus || p.approvalStatus === 'APPROVED') && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION'));
  const registrations = registrationStats || { total: players.length, pending: players.filter(p => p.approvalStatus === 'PENDING').length, approved: players.filter(p => !p.approvalStatus || p.approvalStatus === 'APPROVED').length, rejected: players.filter(p => p.approvalStatus === 'REJECTED').length };

  // Calculate Top Buys
  const topBuys = [...soldPlayers]
    .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
    .slice(0, 5);

  const formatPrice = (val?: number) => formatAuctionPrice(val || 0, tournament.rules?.currency);

  const handleShare = async () => {
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set('mode', 'summary');
    url.searchParams.set('tournamentId', tournament.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true); setShareError(false);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch { setShareError(true); }
  };

  const activeSquad = soldPlayers.filter((p) => p.soldToTeamId === selectedTeamTab);
  const activeTeam = teams.find((t) => t.id === selectedTeamTab);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Floating Spectator Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center shrink-0">
              <TeamLogo logo={tournament.logoUrl || '🏆'} name={tournament.name} className="w-full h-full text-lg" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-none">
                  {tournament.name}
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE SPECTATOR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {tournament.season} • {tournament.city || 'Mega Auction'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedLink ? 'Link Copied!' : shareError ? 'Copy failed — try again' : 'Share Live Link'}</span>
            </button>

            {onExitSpectatorMode && (
              <button
                onClick={onExitSpectatorMode}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
              >
                Organizer Desk &rarr;
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* CURRENT IN-AUCTION SPOTLIGHT (IF ANY PLAYER IS CURRENTLY BEING BID ON) */}
        {currentPlayer && (
          <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3 sm:gap-5 w-full min-w-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-2 border-amber-400/80 overflow-hidden shrink-0 shadow-lg">
                  <img
                    src={currentPlayer.photoUrl || "/player-placeholder.svg"}
                    alt={currentPlayer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 mb-1.5">
                    <Flame className="w-3 h-3" />
                    NOW ON THE FLOOR
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white break-words">{currentPlayer.name}</h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {currentPlayer.role} • {currentPlayer.category} • {currentPlayer.city || 'State'}
                  </p>
                  <div className="mt-2 text-xs font-mono text-slate-400">
                    Base: <span className="text-slate-200">{formatPrice(currentPlayer.basePrice)}</span>
                  </div>
                </div>
              </div>

              {/* Current Bid Display */}
              <div className="w-full md:w-auto text-center md:text-right bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shrink-0 min-w-[200px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Current Highest Bid
                </span>
                <div aria-live="polite" aria-atomic="true" className="text-4xl sm:text-5xl font-black text-amber-400 break-words font-mono my-1">
                  {formatPrice(currentBid || currentPlayer.basePrice)}
                </div>
                {leadingTeam ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: leadingTeam.colorHex }} />
                    <span>Leading: {leadingTeam.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Waiting for opening bid...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {!currentPlayer && <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 text-center"><h2 className="text-xl font-bold">Waiting for the next player</h2><p className="text-sm text-slate-400 mt-2">This page updates automatically as the auction progresses.</p></div>}
        {currentPlayer && bidsHistory.length > 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Recent live bids</h3>
          <div className="space-y-2">{bidsHistory.filter(b => b.playerId === currentPlayer.id).slice(0, 5).map((bid, index) => <div key={bid.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${index === 0 ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-950 text-slate-300'}`}><span className="text-sm font-bold min-w-0 break-words">{bid.teamName}</span><span className="text-sm font-black shrink-0">{formatPrice(bid.amount)}</span></div>)}</div>
        </section>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Total Registrations', registrations.total], ['Pending Approval', registrations.pending], ['Approved Players', registrations.approved], ['Rejected Registrations', registrations.rejected]].map(([label, count]) => (
            <div key={label} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
              <div className="text-2xl font-black text-white mt-1">{count}</div>
            </div>
          ))}
        </div>
        {/* QUICK METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sold</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{soldPlayers.length}</div>
            <span className="text-[10px] text-slate-500">Players Acquired</span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Auction</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">{availablePlayers.length}</div>
            <span className="text-[10px] text-slate-500">Available to Bid</span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unsold</span>
            <div className="text-2xl font-black text-rose-400 mt-1">{unsoldPlayers.length}</div>
            <span className="text-[10px] text-slate-500">Pass to Round 2</span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Purse Spent</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              {formatPrice(soldPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0))}
            </div>
            <span className="text-[10px] text-slate-500">Across all franchises</span>
          </div>
        </div>

        {/* TEAMS LEADERBOARD & SQUADS VIEWER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Team Purses Leaderboard */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Franchise Purse Leaderboard
              </h3>
              <span className="text-[11px] text-slate-400">{teams.length} Teams</span>
            </div>

            <div className="space-y-2">
              {teams.map((team) => {
                const teamSold = soldPlayers.filter((p) => p.soldToTeamId === team.id);
                const spent = teamSold.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
                const remaining = team.remainingPurse ?? (team.totalPurse - spent);
                const pct = Math.max(0, Math.min(100, (remaining / (team.totalPurse || 1)) * 100));

                const maxPlayers = tournament.rules?.maxPlayersPerTeam || 15;
                const minPlayers = tournament.rules?.minPlayersPerTeam || 0;
                const budget = tournament.rules ? getBidBudget({ ...team, remainingPurse: remaining }, players, tournament.rules) : null;
                const isSelected = selectedTeamTab === team.id;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamTab(team.id)}
                    className={`w-full p-3 rounded-2xl text-left transition border ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-lg bg-slate-900 p-0.5 shrink-0 border border-slate-700 flex items-center justify-center">
                          <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-xs" />
                        </div>
                        <span className="font-bold text-white text-xs truncate">{team.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                        {formatPrice(remaining)}
                      </span>
                    </div>

                    {/* Purse Progress Bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: team.colorHex || '#F59E0B',
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                      <span>{teamSold.length} / {maxPlayers} Players Bought</span>
                      <span>{Math.round(pct)}% Purse Left</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mt-3 border-t border-slate-700 pt-3">
                      <span>Slots left: <strong>{Math.max(0, maxPlayers - teamSold.length)}</strong></span>
                      <span>Minimum needed: <strong>{Math.max(0, minPlayers - teamSold.length)}</strong></span>
                      <span>Spent: <strong>{formatPrice(spent)}</strong></span>
                      <span>Reserve for next bid: <strong>{formatPrice(budget?.reserve)}</strong></span>
                      <span className="col-span-2 text-amber-300 font-bold">{budget?.squadComplete ? 'Squad Complete — No More Bids' : `Maximum next bid: ${formatPrice(budget?.maxBid ?? remaining)}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: Selected Team Squad & Top Buys */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top 5 Most Expensive Players */}
            {topBuys.length > 0 && (
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Top Buys Leaderboard
                  </h3>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Highest Bids</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {topBuys.slice(0, 3).map((p, idx) => {
                    const buyerTeam = teams.find((t) => t.id === p.soldToTeamId);
                    return (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3 relative overflow-hidden"
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                          <img src={p.photoUrl || "/player-placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="truncate flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{p.name}</span>
                            <span className="text-[10px] font-black text-amber-400 font-mono">#{idx + 1}</span>
                          </div>
                          <p className="text-[11px] font-mono text-emerald-400 font-bold">{formatPrice(p.soldPrice)}</p>
                          <p className="text-[10px] text-slate-400 truncate">{buyerTeam?.name || 'Franchise'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Team Squad List */}
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center">
                    <TeamLogo logo={activeTeam?.logo || '🛡️'} name={activeTeam?.name || ''} className="w-full h-full text-sm" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {activeTeam?.name || 'Selected Team'} Squad
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Owner: {activeTeam?.ownerName || 'Franchise Owner'}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black">
                  {activeSquad.length} Players
                </span>
              </div>

              {activeSquad.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  This franchise hasn't purchased any players yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSquad.map((player) => (
                    <div
                      key={player.id}
                      className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                          <img src={player.photoUrl || "/player-placeholder.svg"} alt={player.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-white truncate">{player.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{player.role}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatPrice(player.soldPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Spectator Footer */}
      <footer className="p-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Live Streaming Hub powered by Cricket Auction Pro 2026
      </footer>
    </div>
  );
};
