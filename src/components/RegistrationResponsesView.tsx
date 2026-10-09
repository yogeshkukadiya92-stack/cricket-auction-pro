import React, { useEffect, useState } from 'react';
import { CustomFormField, Player } from '../types';

type Summary = { tournament: { name: string; season: string; customFields: CustomFormField[] }; players: Player[] };
const display = (value: unknown): string => value == null || value === '' ? '—' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value);
function Answer({ label, value }: { label: string; value: unknown }) {
  const isImage = typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(value);
  return <div className="min-w-0"><dt className="text-xs text-slate-400 mb-1">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{isImage ? <img src={value as string} alt={label} loading="lazy" className="max-h-96 max-w-full rounded-lg object-contain" /> : display(value)}</dd></div>;
}
export function RegistrationResponsesView({ tournamentId, embedded = false }: { tournamentId?: string; embedded?: boolean }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const id = tournamentId || new URLSearchParams(window.location.search).get('tournamentId');
    setData(null); setError(''); setDenied(false);
    if (!id) { setError('Registration response link is missing its tournament.'); return; }
    let fetching = false;
    let accessDenied = false;
    const refresh = async () => {
      if (fetching || accessDenied) return;
      fetching = true;
      try {
        const response = await fetch(`/api/tournaments/${encodeURIComponent(id)}/registrations`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        const next = await response.json();
        if (response.status === 401 || response.status === 403) {
          accessDenied = true;
          if (!controller.signal.aborted) { setData(null); setDenied(true); }
        }
        if (!response.ok) throw new Error(next.error || 'Unable to load responses');
        if (!controller.signal.aborted) { setData(next); setError(''); }
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [tournamentId]);
  const players = data?.players.filter(p => [p.name, p.mobile, p.email, p.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))) || [];
  return <section className={embedded ? 'text-white space-y-5' : 'min-h-screen bg-slate-950 text-white px-4 py-6 sm:p-8'}>
    <div className="max-w-5xl mx-auto space-y-5">
      <header><p className="text-xs font-bold uppercase text-amber-400 mb-2">Organizer only • Form Responses</p><h1 className="text-2xl sm:text-3xl font-black break-words">{data?.tournament.name || 'Form Responses'}</h1><p className="text-sm text-slate-400 mt-1">{data?.tournament.season}</p></header>
      {error && <p role="alert" className="p-3 rounded-xl bg-red-500/10 text-red-300">{error}</p>}
      {denied && <a href="/" className="inline-block text-amber-400 underline">Sign in with the tournament organizer account</a>}
      {!data && !error && <p role="status">Loading responses…</p>}
      {data && <>
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800"><p className="text-sm text-slate-400">Total responses</p><p aria-live="polite" className="text-4xl font-black text-amber-400 mt-1">{data.players.length}</p><p className="text-xs text-slate-500 mt-2">Updates automatically every 10 seconds</p></section>
        <label className="block"><span className="text-sm text-slate-300">Search responses</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, mobile, email or city" className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-white" /></label>
        {players.length === 0 && <p className="py-8 text-center text-slate-400">{data.players.length ? 'No matching responses.' : 'No registrations yet.'}</p>}
        <div className="space-y-3">{players.map(player => <details key={player.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <summary className="cursor-pointer p-4"><span className="font-bold break-words">{player.name}</span><span className="block text-xs text-slate-400 mt-1">{player.role?.replace(/_/g, ' ')} • {player.approvalStatus || 'APPROVED'} • {player.registeredAt ? new Date(player.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Submission date unavailable'} • View full response</span></summary>
          <div className="p-4 border-t border-slate-800 space-y-5">
            <img src={player.photoUrl || '/player-placeholder.svg'} alt={player.name} loading="lazy" className="w-32 h-40 object-cover rounded-xl" />
            <dl className="grid sm:grid-cols-2 gap-4">
              {([['Full name', player.name], ['Mobile / WhatsApp', player.mobile], ['Email', player.email], ['City', player.city], ['Role', player.role], ['Batting style', player.battingStyle], ['Bowling style', player.bowlingStyle], ['Category', player.category], ['Base price', player.basePrice], ['Approval status', player.approvalStatus || 'APPROVED'], ['Payment status', player.paymentStatus], ['Payment amount (₹)', player.paymentAmount], ['Payment UTR / Transaction ID', player.paymentUtr]] as [string, unknown][]).map(([label, value]) => <Answer key={label} label={label} value={value} />)}
              {Object.entries(player.stats || {}).map(([label, value]) => <Answer key={`stats-${label}`} label={`Stats: ${label.replace(/([A-Z])/g, ' $1')}`} value={value} />)}
            </dl>
            <div><h2 className="font-bold mb-3">Custom answers</h2><dl className="grid sm:grid-cols-2 gap-4">{[...new Set([...(data.tournament.customFields || []).map(f => f.id), ...Object.keys(player.customData || {})])].map(id => <Answer key={id} label={data.tournament.customFields?.find(f => f.id === id)?.label || id} value={player.customData?.[id]} />)}</dl>{!data.tournament.customFields?.length && !Object.keys(player.customData || {}).length && <p className="text-sm text-slate-400">No custom questions.</p>}</div>
            <div><h2 className="font-bold mb-3">Payment screenshot</h2>{player.paymentScreenshotUrl ? <img src={player.paymentScreenshotUrl} alt={`Payment screenshot for ${player.name}`} loading="lazy" className="max-h-96 max-w-full rounded-xl object-contain" /> : <p className="text-sm text-slate-400">No screenshot submitted.</p>}</div>
          </div>
        </details>)}</div>
      </>}
    </div>
  </section>;
}
