import React from 'react';
import { CalendarDays, ChevronRight, MapPin, Radio } from 'lucide-react';
import { MyRegistration, PlayerMe } from '../../services/playerApi';
import { formatAuctionPrice } from '../../utils/currency';
import { TeamLogo } from '../TeamLogo';
import { EmptyState, LiveDot, PlayerAvatar, ROLE_ICON, ROLE_LABEL, StatPill } from './playerUi';

const APPROVAL_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  PENDING: { label: 'Approval pending', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

const PAYMENT_LABEL: Record<string, string> = { VERIFIED: 'Payment verified', PAID: 'Payment submitted', PENDING: 'Payment pending', EXEMPT: 'Fee exempt' };

interface MyRegistrationsProps {
  me: PlayerMe;
  onOpenLive: (registration: MyRegistration) => void;
  onOpenMyProfile: () => void;
}

export const MyRegistrations: React.FC<MyRegistrationsProps> = ({ me, onOpenLive, onOpenMyProfile }) => {
  const { player, registrations } = me;
  const sold = registrations.filter(r => r.auctionStatus === 'SOLD');
  const live = registrations.filter(r => r.isLive);
  const onBlock = registrations.find(r => r.isOnBlock);

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <button id="my-profile-card" type="button" onClick={onOpenMyProfile} className="group relative w-full text-left overflow-hidden rounded-[2rem] p-5 bg-gradient-to-br from-obsidian-800 via-obsidian-850 to-obsidian-900 border border-white/10 shadow-glass active:scale-[0.99] transition">
        <div aria-hidden className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gold-500/20 blur-3xl transition-opacity group-hover:opacity-80" />
        <div aria-hidden className="absolute inset-0 holo-shimmer opacity-[0.07]" />
        <div className="relative flex items-center gap-4">
          <PlayerAvatar id={player.id} name={player.name} role={player.role} hasPhoto={player.hasPhoto} className="w-20 h-20" textClass="text-2xl" ring />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gold-400">Welcome back</p>
            <h2 className="font-display text-2xl font-black truncate">{player.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{ROLE_ICON[player.role]} {ROLE_LABEL[player.role]}{player.city ? ` · ${player.city}` : ''}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 transition group-hover:translate-x-1" />
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5">
          <StatPill label="Tournaments" value={registrations.length} />
          <StatPill label="Sold" value={sold.length} accent="text-emerald-300" />
          <StatPill label="Live now" value={live.length} accent={live.length ? 'text-red-300' : 'text-white'} />
        </div>
      </button>

      {/* You're on the block! */}
      {onBlock && (
        <button id="on-block-banner" type="button" onClick={() => onOpenLive(onBlock)} className="relative w-full overflow-hidden rounded-3xl p-[1.5px] bg-gradient-to-r from-red-500 via-gold-400 to-red-500 cap-border-flow shadow-[0_0_40px_-8px_rgba(239,68,68,0.6)]">
          <div className="rounded-[calc(1.5rem-1.5px)] bg-obsidian-900 px-5 py-4 flex items-center gap-4">
            <Radio className="w-8 h-8 text-red-400 animate-pulse-fast" />
            <div className="text-left flex-1">
              <div className="font-display font-black text-lg">You're on the auction block!</div>
              <div className="text-sm text-slate-300">{onBlock.tournament.name} — tap to watch the bids live</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gold-400" />
          </div>
        </button>
      )}

      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <h3 className="font-display text-lg font-bold">My tournaments</h3>
          <span className="text-xs text-slate-500">+91 {player.mobile.slice(0, 5)} {player.mobile.slice(5)}</span>
        </div>
        {registrations.length === 0 ? (
          <EmptyState icon="🏟️" title="No registrations yet" text="When you register for a tournament with this mobile number, it will appear here." />
        ) : (
          <ul className="space-y-3">
            {registrations.map((r, index) => (
              <li key={r.playerId} style={{ animationDelay: `${index * 60}ms` }} className="cap-rise">
                <RegistrationCard registration={r} onOpenLive={() => onOpenLive(r)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const RegistrationCard: React.FC<{ registration: MyRegistration; onOpenLive: () => void }> = ({ registration: r, onOpenLive }) => {
  const approval = APPROVAL_BADGE[r.approvalStatus] || APPROVAL_BADGE.APPROVED;
  const currency = r.tournament.currency;
  const teamColor = r.team?.colorHex || '#F59E0B';

  return (
    <article className="relative overflow-hidden rounded-3xl glass-panel">
      {r.auctionStatus === 'SOLD' && <div aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: teamColor }} />}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <TeamLogo logo={r.tournament.logoUrl} name={r.tournament.name} className="w-12 h-12 rounded-2xl bg-white/5 grid place-items-center overflow-hidden text-2xl shrink-0" fallbackEmoji="🏆" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-bold text-base leading-tight truncate">{r.tournament.name}</h4>
              {r.isLive && <LiveDot />}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              {(r.tournament.season || r.tournament.year) && <span>{[r.tournament.season, r.tournament.year].filter(Boolean).join(' · ')}</span>}
              {r.tournament.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.tournament.city}</span>}
              {r.tournament.startDate && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(r.tournament.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${approval.className}`}>{approval.label}</span>
          {r.paymentStatus && <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">{PAYMENT_LABEL[r.paymentStatus] || r.paymentStatus}</span>}
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">Base {formatAuctionPrice(r.basePrice, currency)}</span>
        </div>

        <div className="mt-3 rounded-2xl bg-obsidian-950/60 border border-white/[0.06] p-3">
          {r.auctionStatus === 'SOLD' && r.team ? (
            <div className="flex items-center gap-3">
              <TeamLogo logo={r.team.logo} name={r.team.name} className="w-10 h-10 rounded-xl grid place-items-center overflow-hidden text-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-black text-emerald-300">Sold to</div>
                <div className="font-bold truncate" style={{ color: teamColor }}>{r.team.name}</div>
              </div>
              <div className="font-display text-xl font-black text-gold-400">{formatAuctionPrice(r.soldPrice || 0, currency)}</div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Auction status</span>
              <span className={`font-bold ${r.isOnBlock ? 'text-red-300' : r.auctionStatus === 'UNSOLD' ? 'text-slate-300' : 'text-cyan-300'}`}>
                {r.isOnBlock ? '🔴 On the block now' : r.auctionStatus === 'UNSOLD' ? 'Unsold' : 'Awaiting auction'}
              </span>
            </div>
          )}
        </div>

        {r.isLive && (
          <button id={`watch-live-${r.playerId}`} type="button" onClick={onOpenLive} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 py-3 font-display font-black text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,0.8)] active:scale-[0.98] transition inline-flex items-center justify-center gap-2">
            <Radio className="w-4 h-4" /> Watch live auction
          </button>
        )}
        {!r.isLive && r.approvalStatus === 'APPROVED' && (
          <button type="button" onClick={onOpenLive} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-200 active:scale-[0.98] transition">
            View teams & auction board
          </button>
        )}
      </div>
    </article>
  );
};
