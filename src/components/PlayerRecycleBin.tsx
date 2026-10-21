import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, ChevronDown } from 'lucide-react';

type DeletedPlayer = { id: string; name: string; role?: string; lotOrder?: number; deletedAt?: string };
export function PlayerRecycleBin({ tournamentId, playerCount, onRestore }: {
  tournamentId: string;
  playerCount: number;
  onRestore: (playerId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<DeletedPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => { setPlayers([]); setMessage(''); setError(''); setSearch(''); }, [tournamentId]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/deleted-players`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load Recycle Bin');
        if (active) setPlayers(data.players || []);
      }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [open, tournamentId, playerCount, retry]);
  const restore = async (player: DeletedPlayer) => {
    setBusy(player.id); setError(''); setMessage('');
    try {
      await onRestore(player.id);
      setPlayers(prev => prev.filter(p => p.id !== player.id));
      setMessage(`${player.name} restored to the player list.`);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(''); }
  };
  const visible = players.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
    <button type="button" aria-expanded={open} aria-controls="player-recycle-bin" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left font-bold text-amber-300">
      <Trash2 className="w-5 h-5" /><span className="flex-1">Recycle Bin{players.length ? ` (${players.length})` : ''}</span><ChevronDown className={`w-4 h-4 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id="player-recycle-bin" className="p-4 pt-0 space-y-3">
      <p className="text-sm text-slate-400">Removed players are kept here. Restore returns their photo, registration and payment details to the player list as Available. A previous sale is not restored.</p>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <div role="alert" className="text-sm text-red-300">{error} <button className="underline ml-2" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
      {loading ? <p role="status" className="text-sm text-slate-400">Loading removed players…</p> : <>
        {players.length > 0 && <input aria-label="Search Recycle Bin" placeholder="Search removed players…" value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 text-white" />}
        {!error && players.length === 0 && <p className="text-sm text-slate-400">Recycle Bin is empty.</p>}
        {players.length > 0 && visible.length === 0 && <p className="text-sm text-slate-400">No matching removed players.</p>}
        <div className="space-y-2 max-h-96 overflow-y-auto">{visible.map(player => <div key={player.id} className="flex items-center gap-3 rounded-xl bg-slate-900 p-3">
          <div className="flex-1 min-w-0"><p className="font-bold text-white break-words">{player.name}</p><p className="text-xs text-slate-400">{player.role?.replace(/_/g, ' ')}{player.deletedAt ? ` • Removed ${new Date(player.deletedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}</p></div>
          <button type="button" disabled={!!busy} onClick={() => void restore(player)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold disabled:opacity-50"><RotateCcw className="w-4 h-4" />{busy === player.id ? 'Restoring…' : 'Restore'}</button>
        </div>)}</div>
      </>}
    </div>}
  </section>;
}
