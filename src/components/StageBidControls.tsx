import React, { useState } from 'react';
import { Ban, ChevronDown, ChevronUp, Gavel, Search, SkipForward, Undo2 } from 'lucide-react';
import { getBidBudget } from '../../shared/auctionBudget.js';
import { AuctionRules, Player, Team } from '../types';
import { formatAuctionPrice } from '../utils/currency';
import { ask } from '../ui/kit';
import { TeamLogo } from './TeamLogo';

export function StageBidControls({ teams, players, rules, currentPlayer, currentBid, leadingTeam, busy = false, onBid, onSold, onUnsold, onUndo, onNext, tournamentId, onSelectPlayer }: {
  teams: Team[]; players: Player[]; rules: AuctionRules; currentPlayer: Player | null; currentBid: number; leadingTeam: Team | null; busy?: boolean;
  tournamentId?: string; onSelectPlayer?: (player: Player) => void;
  onBid: (team: Team, amount: number) => void; onSold?: () => void; onUnsold?: () => void; onUndo?: () => void; onNext?: () => void;
}) {
  // The audience sees this screen, so controls can fold away.
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const matches = search && tournamentId ? players.filter(player =>
    player.tournamentId === tournamentId &&
    (!player.approvalStatus || player.approvalStatus === 'APPROVED') &&
    (player.status === 'AVAILABLE' || player.status === 'IN_AUCTION') &&
    (player.name.toLocaleLowerCase().includes(search) || String(player.lotOrder).includes(search))
  ).sort((a, b) => a.lotOrder - b.lotOrder) : [];
  const price = (value: number) => formatAuctionPrice(value, rules.currency);
  const nextBid = currentBid > 0 ? currentBid + (rules.bidIncrement || currentPlayer?.basePrice || 20000) : currentPlayer?.basePrice || 0;
  return <section aria-label="Auction controls" className="panel p-3">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 min-h-8 px-1 text-sm font-bold text-slate-300">
      <span role="status">{busy ? 'Saving…' : currentPlayer ? <>Next bid <strong className="text-gold-400">{price(nextBid)}</strong></> : 'Draw a player'}</span>
      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </button>
    {open && <div className="mt-2 space-y-2">
      {onSelectPlayer && tournamentId && <div className="space-y-2">
        <label className="relative block">
          <span className="sr-only">Search this tournament's players by name or lot number</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tournament player by name or lot number…" className="field pl-9 w-full" />
        </label>
        {search && <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10" aria-label="Tournament player search results">
          {matches.map(player => <button key={player.id} type="button" disabled={busy || currentBid > 0 || currentPlayer?.id === player.id} onClick={() => {
            if (busy || currentBid > 0 || currentPlayer?.id === player.id) return;
            onSelectPlayer(player);
            setQuery('');
          }} className="w-full flex items-center justify-between gap-3 p-3 text-left enabled:hover:bg-white/5 disabled:opacity-40">
            <span className="min-w-0"><span className="block font-bold text-white break-words">{player.name}</span><span className="block text-xs text-slate-400">Lot {player.lotOrder} · {price(player.basePrice)}</span></span>
            <span className="shrink-0 text-sm font-bold text-gold-400">{currentPlayer?.id === player.id ? 'Live now' : 'Bring to auction'}</span>
          </button>)}
          {!matches.length && <p role="status" className="p-3 text-sm text-slate-400">No eligible players found in this tournament.</p>}
        </div>}
        {search && currentBid > 0 && <p role="status" className="text-xs text-amber-300">Finish or undo the current bidding before selecting another player.</p>}
      </div>}
      <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-1.5">{teams.map((team) => {
        const budget = getBidBudget(team, players, rules);
        const overBudget = (rules.minimumPlayerReserve || !rules.allowNegativePurse) && nextBid > budget.maxBid;
        const leading = leadingTeam?.id === team.id;
        const disabled = busy || !currentPlayer || nextBid <= 0 || budget.squadComplete || !!overBudget || leading;
        return <button key={team.id} type="button" disabled={disabled} aria-label={`Bid ${price(nextBid)} for ${team.name}`} onClick={() => onBid(team, nextBid)} className={`tile p-2 text-center transition-colors enabled:hover:bg-obsidian-800 ${leading ? '!border-gold-400' : 'disabled:opacity-40'}`}>
          <TeamLogo logo={team.logo} name={team.name} className="w-7 h-7 mx-auto text-xl" />
          <span className="block font-display text-lg font-extrabold leading-tight text-white truncate">{team.shortCode || team.name}</span>
          <span className="block caption text-[11px] text-slate-400 truncate">{budget.squadComplete ? 'Squad full' : overBudget ? 'Over limit' : price(team.remainingPurse)}</span>
        </button>;
      })}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {onUndo && <button disabled={busy || !currentPlayer || currentBid <= 0} onClick={onUndo} className="btn btn-ghost"><Undo2 className="w-4 h-4" /><span className="hidden sm:inline">Undo</span></button>}
        {onUnsold && <button disabled={busy || !currentPlayer} onClick={async () => { if (!currentBid || await ask({ title: 'Mark unsold?', body: 'The current bids will be discarded.', confirmLabel: 'Mark unsold', danger: true })) onUnsold(); }} className="btn bg-red-500/15 border border-red-500/40 text-red-200"><Ban className="w-4 h-4" /><span className="hidden sm:inline">Unsold</span></button>}
        {onNext && <button disabled={busy || currentBid > 0} onClick={onNext} className="btn btn-ghost"><SkipForward className="w-4 h-4" /><span className="hidden sm:inline">Next</span></button>}
        {onSold && <button disabled={busy || !currentPlayer || !leadingTeam || currentBid <= 0} onClick={onSold} className="btn bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold disabled:bg-white/5 disabled:text-slate-500"><Gavel className="w-4 h-4" />Sold</button>}
      </div>
    </div>}
  </section>;
}
