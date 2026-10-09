import React, { useCallback, useEffect, useState } from 'react';
import { Home, KeyRound, Loader2, LogOut, UserRound, Users, ChevronRight, Briefcase } from 'lucide-react';
import { MyRegistration, playerApi, PlayerApiError, PlayerMe } from '../../services/playerApi';
import { PlayerAuthScreen } from './PlayerAuthScreen';
import { MyRegistrations } from './MyRegistrations';
import { PlayerDirectory } from './PlayerDirectory';
import { PlayerProfileView } from './PlayerProfileView';
import { PlayerLiveAuction } from './PlayerLiveAuction';
import { PlayerAvatar, ROLE_LABEL } from './playerUi';

type Tab = 'home' | 'players' | 'account';
type Screen =
  | { name: 'profile'; id: string }
  | { name: 'live'; tournamentId: string; myPlayerId?: string };

interface PlayerAppProps {
  /** Leave the player area (back to the organizer / landing screen). */
  onExit: () => void;
}

export const PlayerApp: React.FC<PlayerAppProps> = ({ onExit }) => {
  const [me, setMe] = useState<PlayerMe | null>(null);
  const [status, setStatus] = useState<'loading' | 'signedOut' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Screen[]>([]);

  const loadMe = useCallback(async (silent = false) => {
    if (!silent) setStatus(s => (s === 'ready' ? s : 'loading'));
    try {
      setMe(await playerApi.me());
      setStatus('ready'); setError('');
    } catch (err) {
      if (err instanceof PlayerApiError && err.status === 401) { setMe(null); setStatus('signedOut'); return; }
      if (!silent) { setError((err as Error).message); setStatus(s => (s === 'ready' ? s : 'error')); }
    }
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);

  // Keep registration / live badges fresh while the home tab is visible.
  useEffect(() => {
    if (status !== 'ready' || tab !== 'home' || stack.length) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void loadMe(true); }, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void loadMe(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [status, tab, stack.length, loadMe]);

  // In-app screens use browser history so the Android back button / browser back work naturally.
  useEffect(() => {
    const onPop = () => setStack(s => s.slice(0, -1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const push = (screen: Screen) => {
    window.history.pushState({ capPlayerScreen: screen.name }, '');
    setStack(s => [...s, screen]);
    window.scrollTo({ top: 0 });
  };
  const back = () => { if (stack.length) window.history.back(); };

  const sessionExpired = () => { setMe(null); setStack([]); setStatus('signedOut'); };

  const logout = async () => {
    try { await playerApi.logout(); } catch { /* cookie is cleared server-side when reachable */ }
    setMe(null); setStack([]); setTab('home'); setStatus('signedOut');
  };

  if (status === 'loading') {
    return <main className="min-h-screen bg-obsidian-950 grid place-items-center"><Loader2 className="w-8 h-8 text-gold-400 animate-spin" /></main>;
  }
  if (status === 'signedOut') {
    return <PlayerAuthScreen onSignedIn={() => { setStatus('loading'); void loadMe(); }} onBack={onExit} />;
  }
  if (status === 'error' || !me) {
    return (
      <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-red-200">{error || 'Could not load your account.'}</p>
          <button type="button" onClick={() => loadMe()} className="rounded-2xl bg-gold-500 text-obsidian-950 font-bold px-6 py-3">Retry</button>
        </div>
      </main>
    );
  }

  const top = stack[stack.length - 1];
  const openLive = (r: MyRegistration) => push({ name: 'live', tournamentId: r.tournament.id, myPlayerId: r.playerId });
  const openTournament = (tournamentId: string) => {
    const mine = me.registrations.find(r => r.tournament.id === tournamentId);
    push({ name: 'live', tournamentId, myPlayerId: mine?.playerId });
  };
  const liveCount = me.registrations.filter(r => r.isLive).length;

  if (top?.name === 'live') {
    return <PlayerLiveAuction key={top.tournamentId} tournamentId={top.tournamentId} myPlayerId={top.myPlayerId} onBack={back} />;
  }

  return (
    <div className="relative min-h-screen bg-obsidian-950 text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 stadium-beam" />

      {/* Tabs stay mounted (hidden) under an open profile so scroll position and search are preserved. */}
      <div className={top ? 'hidden' : ''}>
        <header className="sticky top-0 z-30 bg-obsidian-950/80 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-base shadow-glow-gold">🏏</span>
              <span className="font-display font-black tracking-tight">AUCTION <span className="text-gold-400">PRO</span></span>
            </div>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {liveCount} live
              </span>
            )}
          </div>
        </header>

        <main className="relative max-w-3xl mx-auto px-4 pt-4 pb-32">
          {tab === 'home' && <MyRegistrations me={me} onOpenLive={openLive} onOpenMyProfile={() => me.player.id && push({ name: 'profile', id: me.player.id })} />}
          <div className={tab === 'players' ? '' : 'hidden'}>
            <PlayerDirectory onOpenProfile={id => push({ name: 'profile', id })} onSessionExpired={sessionExpired} />
          </div>
          {tab === 'account' && <AccountTab me={me} onOpenMyProfile={() => me.player.id && push({ name: 'profile', id: me.player.id })} onLogout={logout} onExit={onExit} onSessionExpired={sessionExpired} />}
        </main>

        <TabBar tab={tab} onChange={t => { setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>

      {top?.name === 'profile' && (
        <main className="relative max-w-3xl mx-auto px-4 pt-5">
          <PlayerProfileView key={top.id} profileId={top.id} onBack={back} onOpenTournament={openTournament} onSessionExpired={sessionExpired} />
        </main>
      )}
    </div>
  );
};

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'My Auctions', icon: Home },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'account', label: 'Profile', icon: UserRound },
];

const TabBar: React.FC<{ tab: Tab; onChange: (tab: Tab) => void }> = ({ tab, onChange }) => {
  const index = TABS.findIndex(t => t.id === tab);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 pointer-events-none">
      <div className="pointer-events-auto relative mx-auto max-w-md grid grid-cols-3 rounded-[1.75rem] glass-panel shadow-glass p-1.5">
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[1.4rem] bg-gradient-to-br from-gold-400/25 to-gold-600/10 border border-gold-400/30 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: 'calc((100% - 0.75rem) / 3)', transform: `translateX(${index * 100}%)` }}
        />
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} id={`player-tab-${id}`} type="button" onClick={() => onChange(id)} aria-current={tab === id ? 'page' : undefined}
            className={`relative z-10 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition active:scale-95 ${tab === id ? 'text-gold-400' : 'text-slate-400'}`}>
            <Icon className={`w-5 h-5 transition-transform ${tab === id ? 'scale-110' : ''}`} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

interface AccountTabProps {
  me: PlayerMe;
  onOpenMyProfile: () => void;
  onLogout: () => void;
  onExit: () => void;
  onSessionExpired: () => void;
}

const AccountTab: React.FC<AccountTabProps> = ({ me, onOpenMyProfile, onLogout, onExit, onSessionExpired }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { player } = me;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { setMessage({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    setBusy(true); setMessage(null);
    try {
      await playerApi.changePassword(current, next);
      setCurrent(''); setNext('');
      setMessage({ ok: true, text: 'Password updated. Other devices have been signed out.' });
    } catch (err) {
      if (err instanceof PlayerApiError && err.status === 401 && err.message === 'Please sign in') onSessionExpired();
      else setMessage({ ok: false, text: (err as Error).message });
    } finally { setBusy(false); }
  };

  const input = 'w-full rounded-2xl bg-obsidian-950/70 border border-white/10 px-4 py-3.5 text-white outline-none focus:border-gold-400/60 focus:ring-4 focus:ring-gold-500/10 transition';

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-5 flex items-center gap-4">
        <PlayerAvatar id={player.id} name={player.name} role={player.role} hasPhoto={player.hasPhoto} className="w-16 h-16" textClass="text-xl" ring />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-black truncate">{player.name}</h2>
          <p className="text-sm text-slate-400">{ROLE_LABEL[player.role]} · +91 {player.mobile}</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl divide-y divide-white/[0.06] overflow-hidden">
        <MenuRow icon={UserRound} label="View my public profile" onClick={onOpenMyProfile} disabled={!player.id} />
        <MenuRow icon={Briefcase} label="Organizer / Admin login" onClick={onExit} />
        <MenuRow icon={LogOut} label="Sign out" onClick={onLogout} danger />
      </div>

      <form onSubmit={changePassword} className="glass-panel rounded-3xl p-5 space-y-3">
        <h3 className="font-display font-bold flex items-center gap-2"><KeyRound className="w-4 h-4 text-gold-400" /> Change password</h3>
        <input id="current-password" type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} className={input} />
        <input id="new-password" type="password" autoComplete="new-password" placeholder="New password (min 8 characters)" value={next} onChange={e => setNext(e.target.value)} maxLength={128} className={input} />
        {message && <p role="status" className={`text-sm ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
        <button id="change-password-submit" type="submit" disabled={busy || !current || !next} className="w-full rounded-2xl bg-white/10 border border-white/10 py-3 font-bold disabled:opacity-50 active:scale-[0.98] transition">
          {busy ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Update password'}
        </button>
      </form>
      <p className="text-center text-xs text-slate-600">Forgot your password? Ask your tournament organizer to contact the Auction Pro administrator.</p>
    </div>
  );
};

const MenuRow: React.FC<{ icon: React.ElementType; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }> = ({ icon: Icon, label, onClick, danger, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`w-full flex items-center gap-3 px-5 py-4 text-left font-semibold active:bg-white/5 transition disabled:opacity-40 ${danger ? 'text-red-300' : 'text-slate-100'}`}>
    <Icon className="w-5 h-5" />
    <span className="flex-1">{label}</span>
    <ChevronRight className="w-4 h-4 text-slate-600" />
  </button>
);
