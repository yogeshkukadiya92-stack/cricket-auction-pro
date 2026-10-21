import React from 'react';
import { getBidBudget } from '../../shared/auctionBudget.js';
import { Player, Team, AuctionRules } from '../types';
import { formatAuctionPrice } from '../utils/currency';
import { TeamLogo } from './TeamLogo';

export function StageBidControls({ teams, players, rules, currentPlayer, currentBid, leadingTeam, busy = false, onBid, onSold, onUnsold, onUndo, onNext }: {
  teams: Team[]; players: Player[]; rules: AuctionRules; currentPlayer: Player | null; currentBid: number; leadingTeam: Team | null; busy?: boolean;
  onBid: (team: Team, amount: number) => void; onSold?: () => void; onUnsold?: () => void; onUndo?: () => void; onNext?: () => void;
}) {
  const price = (value: number) => formatAuctionPrice(value, rules.currency);
  const nextBid = currentBid > 0 ? currentBid + (rules.bidIncrement || currentPlayer?.basePrice || 20000) : currentPlayer?.basePrice || 0;
  return <section aria-label="Stage auction controls" className="rounded-2xl border border-gold-400/30 bg-obsidian-950/70 p-4 space-y-3">
    <div className="flex flex-wrap justify-between gap-2 items-center"><h3 className="font-bold text-gold-400">Tap a team to bid</h3><span role="status" className="text-xs text-slate-300">{busy ? 'Saving auction action…' : currentPlayer ? `Next bid: ${price(nextBid)}` : 'Draw a player to begin'}</span></div>
    {!teams.length && <p className="text-sm text-slate-400">Add franchises to enable bidding.</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">{teams.map(team => {
      const budget = getBidBudget(team, players, rules);
      const overBudget = (rules.minimumPlayerReserve || !rules.allowNegativePurse) && nextBid > budget.maxBid;
      const disabled = busy || !currentPlayer || nextBid <= 0 || budget.squadComplete || !!overBudget;
      return <button key={team.id} type="button" disabled={disabled} aria-label={`Bid ${price(nextBid)} for ${team.name}`} onClick={() => onBid(team, nextBid)} className={`rounded-xl border p-3 text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${leadingTeam?.id === team.id ? 'border-gold-400 bg-gold-500/15' : 'border-white/10 bg-white/5 hover:bg-gold-500/15 hover:border-gold-400/60'}`}>
        <TeamLogo logo={team.logo} name={team.name} className="w-10 h-10 mx-auto mb-2 text-3xl" />
        <span className="block text-sm font-black text-white break-words">{team.shortCode || team.name}</span>
        <span className="block text-xs text-gold-300 mt-1">{budget.squadComplete ? 'Squad full' : overBudget ? 'Purse limit' : `Bid ${price(nextBid)}`}</span>
        <span className="block text-[10px] text-slate-400 mt-1">Left: {price(team.remainingPurse)}</span>
      </button>;
    })}</div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
      {onSold && <button disabled={busy || !currentPlayer || !leadingTeam || currentBid <= 0} onClick={onSold} className="rounded-xl bg-emerald-500 text-black font-black px-3 py-3 disabled:opacity-40">SOLD{leadingTeam ? ` · ${leadingTeam.shortCode || leadingTeam.name}` : ''}</button>}
      {onUnsold && <button disabled={busy || !currentPlayer} onClick={() => { if (!currentBid || window.confirm('Mark this player unsold and discard the current bids?')) onUnsold(); }} className="rounded-xl bg-rose-500/20 text-rose-200 font-bold px-3 py-3 disabled:opacity-40">UNSOLD</button>}
      {onUndo && <button disabled={busy || !currentPlayer || currentBid <= 0} onClick={onUndo} className="rounded-xl bg-white/10 text-white font-bold px-3 py-3 disabled:opacity-40">Undo bid</button>}
      {onNext && <button disabled={busy || currentBid > 0} onClick={onNext} className="rounded-xl bg-gold-500 text-black font-bold px-3 py-3 disabled:opacity-40">Next player</button>}
    </div>
  </section>;
}
