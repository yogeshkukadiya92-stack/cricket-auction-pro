import React, { useEffect, useState } from 'react';
import { Player, Team } from '../types';
export function PlayerCorrections({ tournamentId, players, teams, onCorrect }: { tournamentId: string; players: Player[]; teams: Team[]; onCorrect: (action: string, playerId: string, teamId?: string, amount?: number) => Promise<void> }) {
  const [id, setId] = useState(''); const [teamId, setTeam] = useState(''); const [amount, setAmount] = useState('');
  const [trash, setTrash] = useState<Player[]>([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/deleted-players`).then(r => r.json()).then(d => { if(active) setTrash(d.players || []); }).catch(() => {}); return () => { active = false; }; }, [tournamentId, players]);
  const run = async (action: string, playerId = id) => { setBusy(true); setMessage(''); try { await onCorrect(action, playerId, teamId, Number(amount)); setMessage('Saved successfully.'); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  return <details className="p-4 rounded-2xl border border-amber-500/30 bg-white/5 mb-5"><summary className="cursor-pointer font-bold text-amber-300">Manual corrections & deleted player restore</summary>
    <p className="text-xs text-slate-400 mt-3">Changing a sale refunds the previous team and charges the new team. Squad and purse limits still apply. Restored players return as Available, with their photos and registration details.</p>
    <div className="grid sm:grid-cols-3 gap-3 my-3">
      <select aria-label="Player to correct" value={id} onChange={e => { setId(e.target.value); setAmount(String(players.find(p => p.id === e.target.value)?.soldPrice || players.find(p => p.id === e.target.value)?.basePrice || '')); }} className="p-3 rounded-xl bg-slate-900 text-white"><option value="">Select player</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} — {p.status}</option>)}</select>
      <select aria-label="Sold to team" value={teamId} onChange={e => setTeam(e.target.value)} className="p-3 rounded-xl bg-slate-900 text-white"><option value="">Select winning team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <input aria-label="Sold price" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Sold price" className="p-3 rounded-xl bg-slate-900 text-white" />
    </div>
    <div className="flex flex-wrap gap-2">{['SOLD','UNSOLD','AVAILABLE'].map(action => <button key={action} disabled={busy || !id || action === 'SOLD' && (!teamId || !amount)} onClick={() => void run(action)} className="px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-xs disabled:opacity-40">Mark {action}</button>)}</div>
    {message && <p role="status" className="text-sm text-amber-300 mt-3">{message}</p>}
    <h3 className="font-bold text-white mt-5">Deleted players ({trash.length})</h3>
    {!trash.length && <p className="text-xs text-slate-400 mt-2">No deleted players available to restore.</p>}
    <div className="space-y-2 mt-2">{trash.map(p => <div key={p.id} className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl"><img src={p.photoUrl || '/player-placeholder.svg'} alt={p.name} className="w-10 h-10 rounded object-cover" /><span className="flex-1 text-white text-sm">{p.name}</span><button disabled={busy} onClick={() => void run('RESTORE', p.id)} className="text-amber-300 font-bold text-sm">Restore</button></div>)}</div>
  </details>;
}
