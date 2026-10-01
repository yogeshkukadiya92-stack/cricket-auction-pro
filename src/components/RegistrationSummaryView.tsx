import React, { useEffect, useState } from 'react';

type Summary = { tournament: { name: string; season: string }; players: { id: string; name: string; photoUrl: string; role: string }[] };
export function RegistrationSummaryView() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) { setError('Registration summary link is missing its tournament.'); return; }
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await fetch(`/api/public/tournaments/${encodeURIComponent(id)}/registrations`, { cache: 'no-store', signal: controller.signal });
        const next = await response.json();
        if (!response.ok) throw new Error(next.error || 'Unable to load registrations');
        if (!controller.signal.aborted) { setData(next); setError(''); }
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { fetching = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  const players = data?.players.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];
  return <main className="min-h-screen bg-slate-950 text-white px-4 py-6 sm:p-8">
    <div className="max-w-5xl mx-auto space-y-5">
      <header><p className="text-xs font-bold uppercase text-amber-400 mb-2">Player registrations</p><h1 className="text-2xl sm:text-3xl font-black break-words">{data?.tournament.name || 'Registration summary'}</h1><p className="text-sm text-slate-400 mt-1">{data?.tournament.season}</p></header>
      {error && <p role="alert" className="p-3 rounded-xl bg-red-500/10 text-red-300">{error}</p>}
      {!data && !error && <p role="status">Loading registrations…</p>}
      {data && <>
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800"><p className="text-sm text-slate-400">Total forms submitted</p><p aria-live="polite" className="text-4xl font-black text-amber-400 mt-1">{data.players.length}</p><p className="text-xs text-slate-500 mt-2">Updates automatically every 10 seconds</p></section>
        <label className="block"><span className="text-sm text-slate-300">Search players</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Player name" className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-white" /></label>
        {players.length === 0 && <p className="py-8 text-center text-slate-400">{data.players.length ? 'No matching players.' : 'No registrations yet.'}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{players.map(player => <article key={player.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"><img src={player.photoUrl || '/player-placeholder.svg'} alt={player.name} loading="lazy" className="w-full aspect-square object-cover" /><div className="p-3"><h2 className="font-bold text-sm break-words">{player.name}</h2><p className="text-xs text-slate-400 mt-1">{(player.role || '').replace(/_/g, ' ')}</p></div></article>)}</div>
      </>}
    </div>
  </main>;
}
