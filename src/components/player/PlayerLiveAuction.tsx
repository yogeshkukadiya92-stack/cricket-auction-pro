import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PublicSpectatorView } from '../PublicSpectatorView';
import { BidRecord, Player, Team, Tournament } from '../../types';

interface Summary {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  registrationPlayers?: Player[];
  registrationStats?: { total: number; pending: number; approved: number; rejected: number };
  liveState?: { currentPlayerId?: string; currentBid?: number; leadingTeam?: { id: string } | null; bidsHistory?: BidRecord[] };
}

interface PlayerLiveAuctionProps {
  tournamentId: string;
  /** The signed-in player's lot in this tournament, if any — highlighted when on the block. */
  myPlayerId?: string;
  onBack: () => void;
}

/** Live auction board for players; refreshes every 2 s like the public spectator page. */
export const PlayerLiveAuction: React.FC<PlayerLiveAuctionProps> = ({ tournamentId, myPlayerId, onBack }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/public/tournaments/${encodeURIComponent(tournamentId)}/summary`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Tournament unavailable');
        if (!cancelled) { setSummary(data); setError(''); }
      } catch (err) {
        if (!cancelled) setError((err as Error).message === 'Failed to fetch' ? 'Reconnecting…' : (err as Error).message);
      }
    };
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [tournamentId]);

  if (!summary) {
    return (
      <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center px-6">
        <div className="text-center space-y-4">
          {error ? <p className="text-red-200">{error}</p> : <Loader2 className="w-8 h-8 mx-auto text-gold-400 animate-spin" />}
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
      </main>
    );
  }

  const state = summary.liveState || {};
  const currentPlayer = summary.players.find(p => p.id === state.currentPlayerId) || null;
  const myLotLive = !!myPlayerId && state.currentPlayerId === myPlayerId;
  const isLive = summary.tournament.status === 'LIVE' || !!state.currentPlayerId;

  return (
    <div className="relative">
      <div className="sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-obsidian-950/80 backdrop-blur-xl border-b border-white/5">
          <button
            type="button"
            id="player-live-back"
            onClick={onBack}
            aria-label="Back"
            className="grid place-items-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white active:scale-90 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">{isLive ? 'Live auction' : 'Auction board'}</p>
            <p className="text-sm font-bold text-white truncate">{summary.tournament.name}</p>
          </div>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-300">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
              LIVE
            </span>
          )}
        </div>
        {(error || myLotLive) && (
          <div role="status" className={`px-4 py-2.5 text-center text-sm font-bold ${myLotLive ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 cap-border-flow text-white' : 'bg-slate-900 text-amber-300'}`}>
            {myLotLive ? '🔴 You are on the auction block right now!' : error}
          </div>
        )}
      </div>
      <PublicSpectatorView
        tournament={summary.tournament}
        teams={summary.teams}
        players={summary.players}
        registrationStats={summary.registrationStats}
        registrationPlayers={summary.registrationPlayers}
        currentPlayer={currentPlayer}
        currentBid={state.currentBid || 0}
        leadingTeam={summary.teams.find(t => t.id === state.leadingTeam?.id) || null}
        bidsHistory={state.bidsHistory || []}
      />
    </div>
  );
};
