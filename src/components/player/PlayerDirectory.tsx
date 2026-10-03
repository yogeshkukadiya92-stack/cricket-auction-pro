import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { DirectoryPlayer, playerApi, PlayerApiError } from '../../services/playerApi';
import { PlayerRole } from '../../types';
import { EmptyState, LiveDot, PlayerAvatar, ROLE_ICON, ROLE_LABEL } from './playerUi';

const ROLE_FILTERS: Array<{ value: '' | PlayerRole; label: string }> = [
  { value: '', label: 'All' },
  { value: 'BATSMAN', label: `${ROLE_ICON.BATSMAN} Batters` },
  { value: 'BOWLER', label: `${ROLE_ICON.BOWLER} Bowlers` },
  { value: 'ALL_ROUNDER', label: `${ROLE_ICON.ALL_ROUNDER} All-Rounders` },
  { value: 'WICKET_KEEPER', label: `${ROLE_ICON.WICKET_KEEPER} Keepers` },
];

interface PlayerDirectoryProps {
  onOpenProfile: (id: string) => void;
  onSessionExpired: () => void;
}

export const PlayerDirectory: React.FC<PlayerDirectoryProps> = ({ onOpenProfile, onSessionExpired }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<'' | PlayerRole>('');
  const [players, setPlayers] = useState<DirectoryPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset & load the first page whenever the search changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    playerApi.directory({ q: debounced, role }, controller.signal).then(data => {
      setPlayers(data.players); setTotal(data.total); setPage(0); setHasMore(data.hasMore);
    }).catch(err => {
      if (controller.signal.aborted) return;
      if (err instanceof PlayerApiError && err.status === 401) onSessionExpired();
      else setError((err as Error).message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debounced, role]);

  // Infinite scroll.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      setLoading(true);
      playerApi.directory({ q: debounced, role, page: page + 1 }).then(data => {
        setPlayers(prev => [...prev, ...data.players.filter(p => !prev.some(x => x.id === p.id))]);
        setPage(data.page); setHasMore(data.hasMore);
      }).catch(err => setError((err as Error).message)).finally(() => setLoading(false));
    }, { rootMargin: '400px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, page, debounced, role]);

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-obsidian-950/85 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            id="player-search" type="text" inputMode="search" autoComplete="off" autoCorrect="off" spellCheck={false}
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search players by name or city" enterKeyHint="search" aria-label="Search players"
            className="w-full rounded-2xl bg-white/[0.05] border border-white/10 py-3.5 pl-12 pr-11 text-white placeholder:text-slate-500 outline-none focus:border-gold-400/60 focus:ring-4 focus:ring-gold-500/10 transition"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto cap-scroll-hide mt-3 -mx-1 px-1">
          {ROLE_FILTERS.map(filter => (
            <button
              key={filter.value || 'all'} id={`role-filter-${filter.value || 'all'}`} type="button" onClick={() => setRole(filter.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition active:scale-95 ${role === filter.value ? 'bg-gold-500 text-obsidian-950 border-gold-400 shadow-glow-gold' : 'bg-white/5 text-slate-300 border-white/10'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && <p className="text-xs text-slate-500 px-1">{total} player{total === 1 ? '' : 's'}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">{error}</p>}

      {!loading && !error && players.length === 0 ? (
        <EmptyState icon="🔍" title="No players found" text="Try a different name, city or role filter." />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((p, index) => (
            <li key={p.id} className="cap-rise" style={{ animationDelay: `${Math.min(index % 24, 12) * 35}ms` }}>
              <PlayerTile player={p} onClick={() => onOpenProfile(p.id)} />
            </li>
          ))}
          {loading && Array.from({ length: players.length ? 2 : 6 }).map((_, i) => (
            <li key={`s${i}`} className="h-56 rounded-3xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
          ))}
        </ul>
      )}
      <div ref={sentinel} className="h-4" />
      {loading && players.length > 0 && <Loader2 className="mx-auto w-5 h-5 text-gold-400 animate-spin" />}
    </div>
  );
};

const PlayerTile: React.FC<{ player: DirectoryPlayer; onClick: () => void }> = ({ player: p, onClick }) => {
  const ref = useRef<HTMLButtonElement>(null);
  // Light 3D tilt + specular glare that follows the finger / pointer.
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(700px) rotateX(${((0.5 - y) * 10).toFixed(2)}deg) rotateY(${((x - 0.5) * 12).toFixed(2)}deg) scale(1.02)`;
    el.style.setProperty('--glare-x', `${x * 100}%`);
    el.style.setProperty('--glare-y', `${y * 100}%`);
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };

  return (
    <button
      ref={ref} type="button" onClick={onClick} onPointerMove={move} onPointerLeave={leave} onPointerUp={leave}
      className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-obsidian-800 to-obsidian-900 border border-white/[0.08] text-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
    >
      <div className="relative aspect-[4/5]">
        <PlayerAvatar id={p.id} name={p.name} role={p.role} hasPhoto={p.hasPhoto} className="!absolute inset-0 w-full h-full !rounded-none !ring-0" textClass="text-5xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/30 to-transparent" />
        <div aria-hidden className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at var(--glare-x,50%) var(--glare-y,0%), rgba(255,255,255,0.22), transparent 55%)' }} />
        {p.inLiveTournament && <div className="absolute top-2.5 left-2.5"><LiveDot /></div>}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <div className="font-display font-black text-[15px] leading-tight line-clamp-2 drop-shadow">{p.name}</div>
          <div className="text-[11px] text-slate-300 mt-0.5 truncate">{ROLE_ICON[p.role]} {ROLE_LABEL[p.role]}{p.city ? ` · ${p.city}` : ''}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] text-center">
        <MiniStat label="Runs" value={p.stats.runs} />
        <MiniStat label="Wkts" value={p.stats.wickets} />
        <MiniStat label="Sold" value={p.soldCount} gold />
      </div>
    </button>
  );
};

const MiniStat: React.FC<{ label: string; value: number; gold?: boolean }> = ({ label, value, gold }) => (
  <div className="py-2">
    <div className={`text-sm font-black ${gold ? 'text-gold-400' : 'text-white'}`}>{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
  </div>
);
