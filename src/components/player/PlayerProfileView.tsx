import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Radio, Trophy } from 'lucide-react';
import { HistoryEntry, playerApi, PlayerApiError, PlayerProfileDetail } from '../../services/playerApi';
import { formatAuctionPrice } from '../../utils/currency';
import { TeamLogo } from '../TeamLogo';
import { LiveDot, PlayerAvatar, ROLE_GRADIENT, ROLE_ICON, ROLE_LABEL, StatPill } from './playerUi';

interface PlayerProfileViewProps {
  profileId: string;
  onBack: () => void;
  onOpenTournament: (tournamentId: string) => void;
  onSessionExpired: () => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({ profileId, onBack, onOpenTournament, onSessionExpired }) => {
  const [data, setData] = useState<PlayerProfileDetail | null>(null);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setData(null); setError('');
    playerApi.profile(profileId).then(result => { if (active) setData(result); }).catch(err => {
      if (!active) return;
      if (err instanceof PlayerApiError && err.status === 401) onSessionExpired();
      else setError((err as Error).message);
    });
    return () => { active = false; };
  }, [profileId]);

  // 3D holographic tilt for the player card (pointer or device motion).
  const tilt = (e: React.PointerEvent) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateX(${((0.5 - y) * 12).toFixed(2)}deg) rotateY(${((x - 0.5) * 16).toFixed(2)}deg)`;
    el.style.setProperty('--glare-x', `${x * 100}%`);
    el.style.setProperty('--glare-y', `${y * 100}%`);
  };
  const resetTilt = () => { if (cardRef.current) cardRef.current.style.transform = ''; };

  return (
    <div className="space-y-6 pb-6">
      <button id="profile-back" type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 active:scale-95 transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {error && <p role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">{error}</p>}
      {!data && !error && <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 text-gold-400 animate-spin" /></div>}

      {data && (
        <>
          <div className="perspective-1000 flex justify-center">
            <div
              ref={cardRef} onPointerMove={tilt} onPointerLeave={resetTilt} onPointerUp={resetTilt}
              className="relative w-full max-w-sm preserve-3d transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <div className={`absolute -inset-1 rounded-[2.2rem] bg-gradient-to-br ${ROLE_GRADIENT[data.player.role]} opacity-60 blur-xl`} />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-obsidian-900 shadow-glass">
                <div className="relative aspect-[4/5]">
                  <PlayerAvatar id={data.player.id} name={data.player.name} role={data.player.role} hasPhoto={data.player.hasPhoto} className="!absolute inset-0 w-full h-full !rounded-none !ring-0" textClass="text-7xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/20 to-transparent" />
                  <div aria-hidden className="absolute inset-0 mix-blend-overlay" style={{ background: 'radial-gradient(circle at var(--glare-x,30%) var(--glare-y,10%), rgba(255,255,255,0.35), transparent 50%)' }} />
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start" style={{ transform: 'translateZ(40px)' }}>
                    <span className="rounded-full bg-obsidian-950/70 backdrop-blur px-3 py-1.5 text-xs font-black tracking-wide border border-white/15">
                      {ROLE_ICON[data.player.role]} {ROLE_LABEL[data.player.role]}
                    </span>
                    {data.isMe && <span className="rounded-full bg-gold-500 text-obsidian-950 px-3 py-1.5 text-xs font-black">YOU</span>}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-5" style={{ transform: 'translateZ(60px)' }}>
                    <h2 className="font-display text-3xl font-black leading-none drop-shadow-lg">{data.player.name}</h2>
                    {data.player.city && <p className="text-sm text-slate-300 mt-1.5">📍 {data.player.city}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/[0.06] border-t border-white/[0.06]">
                  <StyleCell label="Batting" value={data.player.battingStyle || '—'} />
                  <StyleCell label="Bowling" value={data.player.bowlingStyle || '—'} />
                </div>
              </div>
            </div>
          </div>

          <section>
            <h3 className="font-display font-bold mb-3 px-1">Career stats</h3>
            <div className="grid grid-cols-4 gap-2">
              <StatPill label="Matches" value={data.player.stats.matches} />
              <StatPill label="Runs" value={data.player.stats.runs} accent="text-gold-400" />
              <StatPill label="Wickets" value={data.player.stats.wickets} accent="text-cyan-300" />
              <StatPill label="SR" value={data.player.stats.strikeRate || '—'} />
            </div>
          </section>

          <section>
            <h3 className="font-display font-bold mb-3 px-1">Auction record</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatPill label="Tournaments" value={data.summary.tournaments} />
              <StatPill label="Sold" value={data.summary.sold} accent="text-emerald-300" />
              <StatPill label="Unsold" value={data.summary.unsold} accent="text-slate-300" />
            </div>
            {data.history.length === 0 ? (
              <p className="text-sm text-slate-500 px-1">No approved tournament appearances yet.</p>
            ) : (
              <ol className="relative space-y-3 before:absolute before:left-[1.35rem] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold-500/60 before:to-transparent">
                {data.history.map((entry, i) => (
                  <li key={`${entry.tournament.id}-${i}`} className="cap-rise" style={{ animationDelay: `${i * 70}ms` }}>
                    <HistoryRow entry={entry} onOpen={() => onOpenTournament(entry.tournament.id)} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const StyleCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-obsidian-900 px-4 py-3">
    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
    <div className="text-sm font-semibold text-white truncate">{value}</div>
  </div>
);

const HistoryRow: React.FC<{ entry: HistoryEntry; onOpen: () => void }> = ({ entry, onOpen }) => {
  const sold = entry.auctionStatus === 'SOLD' && entry.team;
  return (
    <button type="button" onClick={onOpen} className="relative w-full flex items-center gap-3 rounded-2xl glass-panel p-3 text-left active:scale-[0.99] transition">
      <div className={`relative z-10 w-11 h-11 rounded-xl grid place-items-center shrink-0 ${sold ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
        {sold ? <TeamLogo logo={entry.team!.logo} name={entry.team!.name} className="w-9 h-9 text-xl" /> : <Trophy className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate">{entry.tournament.name}</span>
          {entry.isLive && <LiveDot />}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {sold ? <>Sold to <b style={{ color: entry.team!.colorHex }}>{entry.team!.name}</b></> : entry.auctionStatus === 'UNSOLD' ? 'Unsold' : 'Awaiting auction'}
          {entry.tournament.season ? ` · ${entry.tournament.season}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        {sold ? (
          <div className="font-display font-black text-gold-400">{formatAuctionPrice(entry.soldPrice || 0, entry.tournament.currency)}</div>
        ) : entry.isLive ? (
          <Radio className="w-4 h-4 text-red-400 ml-auto" />
        ) : (
          <div className="text-xs text-slate-500">Base {formatAuctionPrice(entry.basePrice, entry.tournament.currency)}</div>
        )}
      </div>
    </button>
  );
};
