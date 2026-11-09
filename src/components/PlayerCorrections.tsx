import React, { useState } from 'react';
import { Player, Team } from '../types';
export function PlayerCorrections({ tournamentId, players, teams, onCorrect }: { tournamentId: string; players: Player[]; teams: Team[]; onCorrect: (action: string, playerId: string, teamId?: string, amount?: number) => Promise<void> }) {
  const [id, setId] = useState(''); const [teamId, setTeam] = useState(''); const [amount, setAmount] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (action: string, playerId = id) => { setBusy(true); setMessage(''); try { await onCorrect(action, playerId, teamId, Number(amount)); setMessage('Saved successfully.'); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  return <details className="panel p-4"><summary className="cursor-pointer min-h-7 font-bold text-slate-200">Fix a sale</summary>
    <div className="grid sm:grid-cols-3 gap-3 my-3">
      <select aria-label="Player to correct" value={id} onChange={e => { setId(e.target.value); setAmount(String(players.find(p => p.id === e.target.value)?.soldPrice || players.find(p => p.id === e.target.value)?.basePrice || '')); }} className="field"><option value="">Player</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} — {p.status}</option>)}</select>
      <select aria-label="Sold to team" value={teamId} onChange={e => setTeam(e.target.value)} className="field"><option value="">Team</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <input aria-label="Sold price" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Price" className="field" />
    </div>
    <div className="flex flex-wrap gap-2">{['SOLD','UNSOLD','AVAILABLE'].map(action => <button key={action} disabled={busy || !id || action === 'SOLD' && (!teamId || !amount)} onClick={() => void run(action)} className="btn btn-ghost">{action === 'SOLD' ? 'Mark sold' : action === 'UNSOLD' ? 'Mark unsold' : 'Back to waiting'}</button>)}</div>
    {message && <p role="status" className="text-sm text-amber-300 mt-3">{message}</p>}
  </details>;
}
