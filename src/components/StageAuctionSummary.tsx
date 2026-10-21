import React, { useState } from 'react';
import { Player, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { formatAuctionPrice } from '../utils/currency';

type Filter = 'ALL' | 'SOLD' | 'UNSOLD' | 'REMAINING';
export function StageAuctionSummary({ players, teams, tournamentName, currency, onBack }: {
  players: Player[]; teams: Team[]; tournamentName: string; currency?: import('../types').CurrencyType; onBack: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [teamId, setTeamId] = useState('');
  const [search, setSearch] = useState('');
  const money = (amount: number) => formatAuctionPrice(amount, currency);
  const sold = players.filter(p => p.status === 'SOLD');
  const unsold = players.filter(p => p.status === 'UNSOLD');
  const remaining = players.filter(p => p.status === 'AVAILABLE' || p.status === 'IN_AUCTION');
  const spent = sold.reduce((sum, player) => sum + (player.soldPrice || 0), 0);
  const stats: [Filter, string, number][] = [['ALL','Total players',players.length],['SOLD','Sold',sold.length],['UNSOLD','Unsold',unsold.length],['REMAINING','Remaining',remaining.length]];
  const visible = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesTeam = !teamId || player.status === 'SOLD' && player.soldToTeamId === teamId;
    const matchesStatus = filter === 'ALL' || (filter === 'REMAINING'
      ? player.status === 'AVAILABLE' || player.status === 'IN_AUCTION'
      : player.status === filter);
    return matchesSearch && matchesTeam && matchesStatus;
  });
  return <section className="auction-stage rounded-3xl border border-white/10 bg-obsidian-950 text-white p-4 sm:p-6 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-gold-400 uppercase font-bold">{tournamentName}</p><h1 className="text-2xl font-black">Auction Summary</h1><p className="text-xs text-slate-400 mt-1">Updates automatically as the auction progresses.</p></div><button onClick={onBack} className="rounded-xl bg-gold-500 px-5 py-3 font-bold text-black">← Back to Stage</button></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stats.map(([value,label,count]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setTeamId(''); }} className={`text-left p-4 rounded-2xl border ${filter === value ? 'border-gold-400 bg-gold-500/10' : 'border-white/10 bg-white/5'}`}><span className="text-xs font-bold text-slate-400">{label}</span><span className="block text-3xl font-black mt-1">{count}</span></button>)}</div>
    <div className="flex flex-wrap justify-between gap-3 rounded-2xl bg-white/5 p-4"><span>Total spent: <strong className="text-gold-400">{money(spent)}</strong></span><span>Remaining team purse: <strong>{money(teams.reduce((sum,t) => sum + t.remainingPurse, 0))}</strong></span></div>
    <section aria-label="Team purchase summary" className="space-y-3"><h2 className="font-bold text-lg">Teams & purchases</h2>{!teams.length && <p className="text-sm text-slate-400">No franchises added yet.</p>}<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{teams.map(team => {
      const acquired = sold.filter(p => p.soldToTeamId === team.id);
      const teamSpent = acquired.reduce((sum,p) => sum + (p.soldPrice || 0),0);
      return <button key={team.id} aria-pressed={teamId === team.id} onClick={() => { setTeamId(teamId === team.id ? '' : team.id); setFilter('SOLD'); }} className={`text-left p-4 rounded-2xl border ${teamId === team.id ? 'border-gold-400 bg-gold-500/10' : 'border-white/10 bg-white/5'}`}><div className="flex items-center gap-3"><TeamLogo logo={team.logo} name={team.name} className="w-10 h-10 text-3xl" /><div className="min-w-0"><h3 className="font-black break-words">{team.shortCode || team.name}</h3><p className="text-xs text-slate-400 break-words">{team.name}</p></div></div><p className="mt-3 text-sm">Bought <strong>{acquired.length}</strong> players</p><p className="text-xs text-slate-400 mt-1">Spent: {money(teamSpent)}</p><p className="text-xs text-emerald-300 mt-1">Purse left: {money(team.remainingPurse)}</p></button>;
    })}</div></section>
    <section className="space-y-3"><div className="flex flex-wrap justify-between gap-3 items-center"><h2 className="font-bold text-lg">{teamId ? teams.find(t => t.id === teamId)?.name : stats.find(([value]) => value === filter)?.[1]} · {visible.length} players</h2><input aria-label="Search summary players" placeholder="Search player name…" value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm w-full sm:w-64" /></div>
      {!visible.length && <p className="text-sm text-slate-400 py-6">No players match this selection.</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{visible.map(player => <article key={player.id} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><img loading="lazy" decoding="async" src={player.photoUrl || '/player-placeholder.svg'} alt={player.name} className="w-14 h-16 rounded-lg object-cover" /><div className="min-w-0"><h3 className="font-bold break-words">{player.name}</h3><p className="text-xs text-slate-400">{player.role?.replace(/_/g,' ')} · {player.status === 'AVAILABLE' || player.status === 'IN_AUCTION' ? 'Remaining' : player.status}</p>{player.status === 'SOLD' ? <p className="text-sm text-emerald-300 mt-1">{teams.find(t => t.id === player.soldToTeamId)?.shortCode || teams.find(t => t.id === player.soldToTeamId)?.name || 'Team unavailable'} · {money(player.soldPrice || 0)}</p> : <p className="text-xs text-slate-400 mt-1">Base: {money(player.basePrice)}</p>}</div></article>)}</div>
    </section>
  </section>;
}
