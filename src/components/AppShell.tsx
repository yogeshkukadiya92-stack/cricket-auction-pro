import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  Check, ChevronsUpDown, ClipboardList, Database, Eye, FileSpreadsheet, Gavel, Hand, Home, LayoutGrid, Loader2, LogOut, Maximize2,
  Plus, Radio, Settings, Shield, Sparkles, Trophy, Tv, UserRound, Users, Volume2, VolumeX, X,
} from 'lucide-react';
import { Tournament, User, ViewMode } from '../types';
import { sounds } from '../soundEffects';
import { TeamLogo } from './TeamLogo';

interface NavItem { mode: ViewMode; label: string; icon: React.ElementType; external?: boolean }
interface NavGroup { label?: string; items: NavItem[] }

// Navigation follows the order an organizer actually works in.
const groups: NavGroup[] = [
  { items: [{ mode: 'TOURNAMENT_OVERVIEW', label: 'Home', icon: Home }] },
  { label: 'Prepare', items: [
    { mode: 'PLAYERS', label: 'Players', icon: Users },
    { mode: 'TEAMS', label: 'Teams', icon: Shield },
    { mode: 'FORM_BUILDER', label: 'Sign-up form', icon: ClipboardList },
    { mode: 'RULES', label: 'Rules', icon: Settings },
  ] },
  { label: 'Auction', items: [
    { mode: 'AUCTIONEER', label: 'Auction desk', icon: Gavel },
    { mode: 'STAGE', label: 'Big screen', icon: Tv },
    { mode: 'PADDLE', label: 'Team paddle', icon: Hand },
  ] },
  { label: 'Results', items: [
    { mode: 'SQUADS', label: 'Squads', icon: FileSpreadsheet },
    { mode: 'PUBLIC_SUMMARY', label: 'Public live page', icon: Eye, external: true },
    { mode: 'OBS', label: 'OBS overlay', icon: Radio, external: true },
  ] },
];

interface AppShellProps {
  mode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  tournament: Tournament;
  tournaments: Tournament[];
  user: User;
  onSelectTournament: (id: string) => void;
  onCreateTournament: () => void;
  onOpenBackup: () => void;
  onOpenWheel: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);
  return { open, setOpen, ref };
}

export function AppShell({ mode, onSelect, tournament, tournaments, user, onSelectTournament, onCreateTournament, onOpenBackup, onOpenWheel, onLogout, children }: AppShellProps) {
  const hasTournament = !!tournament.id;
  const [sound, setSound] = useState(sounds.enabled);
  const [sheet, setSheet] = useState(false);
  const compactRail = mode === 'STAGE';
  const switcher = usePopover();
  const account = usePopover();

  const go = (next: ViewMode) => { sounds.playTick(); setSheet(false); onSelect(next); window.scrollTo({ top: 0 }); };
  const toggleSound = () => { sounds.enabled = !sound; setSound(!sound); };
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); };
  const visibleGroups = hasTournament ? groups : [];

  const accountItems = <>
    <p className="px-3 pt-2 pb-2.5 border-b border-white/10 mb-1.5">
      <span className="block text-sm font-bold text-white truncate">{user.name}</span>
      <span className="block text-xs text-slate-400 truncate">{user.email}</span>
    </p>
    <MenuRow icon={UserRound} label="My profile" onClick={() => { account.setOpen(false); go('ORGANIZER_PROFILE'); }} />
    <MenuRow icon={Trophy} label="All tournaments" onClick={() => { account.setOpen(false); go('TOURNAMENTS'); }} />
    <MenuRow icon={Database} label="Backup & restore" onClick={() => { account.setOpen(false); onOpenBackup(); }} />
    {user.role === 'ADMIN' && <MenuRow icon={Shield} label="Admin panel" onClick={() => { account.setOpen(false); go('ADMIN_PANEL'); }} />}
    <MenuRow icon={LogOut} label="Sign out" danger onClick={() => { account.setOpen(false); onLogout(); }} />
  </>;

  return <div className={`min-h-screen bg-obsidian-950 text-slate-100 ${mode === 'STAGE' ? 'stage-mode' : ''}`}>
    {/* Desktop rail */}
    <aside className={`app-rail hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-white/10 bg-obsidian-900 ${compactRail ? 'w-16' : 'w-16 xl:w-56'}`}>
      <button onClick={() => go(hasTournament ? 'TOURNAMENT_OVERVIEW' : 'TOURNAMENTS')} className="h-16 shrink-0 flex items-center gap-2.5 px-4 border-b border-white/10 text-left" aria-label="Go to home">
        <span className="w-8 h-8 shrink-0 rounded-lg bg-gold-500 text-black grid place-items-center"><Gavel className="w-5 h-5" /></span>
        <span className={`font-display text-xl font-extrabold uppercase leading-none text-white ${compactRail ? 'hidden' : 'hidden xl:block'}`}>Auction Pro</span>
      </button>
      <nav aria-label="Main" className="flex-1 overflow-y-auto cap-scroll-hide py-3 px-2 space-y-4">
        {visibleGroups.map((group, index) => <div key={index}>
          {group.label && <p className={`px-2.5 mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 ${compactRail ? 'hidden' : 'hidden xl:block'}`}>{group.label}</p>}
          <div className="space-y-0.5">{group.items.map((item) => <RailLink key={item.mode} item={item} active={mode === item.mode} compact={compactRail} onClick={() => go(item.mode)} />)}</div>
        </div>)}
        {!hasTournament && <RailLink item={{ mode: 'TOURNAMENTS', label: 'Tournaments', icon: Trophy }} active={mode === 'TOURNAMENTS'} compact={compactRail} onClick={() => go('TOURNAMENTS')} />}
      </nav>
    </aside>

    <div className={`flex min-h-screen flex-col ${compactRail ? 'md:pl-16' : 'md:pl-16 xl:pl-56'}`}>
      {/* Top bar */}
      <header className="app-top sticky top-0 z-30 h-16 flex items-center justify-between gap-2 border-b border-white/10 bg-obsidian-950/90 backdrop-blur-lg px-3 sm:px-5">
        <div ref={switcher.ref} className="relative min-w-0">
          <button onClick={() => switcher.setOpen(!switcher.open)} aria-expanded={switcher.open} className="flex items-center gap-2.5 min-w-0 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-obsidian-800 border border-white/10 grid place-items-center overflow-hidden"><TeamLogo logo={tournament.logoUrl || '🏆'} name={tournament.name} className="w-full h-full text-lg" /></span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-extrabold text-white truncate max-w-[42vw] sm:max-w-xs">{hasTournament ? tournament.name : 'No tournament yet'}</span>
              {hasTournament && <span className="block text-[11px] text-slate-400 truncate">{tournament.season} · {tournament.year}</span>}
            </span>
            <ChevronsUpDown className="w-4 h-4 shrink-0 text-slate-400" />
          </button>
          {switcher.open && <div className="cap-rise absolute top-full left-0 mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/15 bg-obsidian-800 p-1.5 shadow-glass z-50">
            <div className="max-h-64 overflow-y-auto">
              {tournaments.map((item) => <button key={item.id} onClick={() => { switcher.setOpen(false); onSelectTournament(item.id); }} className={`w-full flex items-center gap-2.5 rounded-lg p-2 text-left ${item.id === tournament.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                <TeamLogo logo={item.logoUrl || '🏆'} name={item.name} className="w-7 h-7 text-base" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white truncate">{item.name}</span><span className="block text-[11px] text-slate-400 truncate">{item.season}</span></span>
                {item.id === tournament.id && <Check className="w-4 h-4 text-gold-400 shrink-0" />}
              </button>)}
            </div>
            <button onClick={() => { switcher.setOpen(false); onCreateTournament(); }} className="btn btn-primary w-full mt-1.5"><Plus className="w-4 h-4" />New tournament</button>
          </div>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onOpenWheel} disabled={!hasTournament} className="btn-icon hidden sm:grid" aria-label="Fortune wheel" title="Fortune wheel"><Sparkles className="w-5 h-5" /></button>
          <button onClick={toggleSound} className="btn-icon" aria-label={sound ? 'Mute sound' : 'Turn sound on'} title={sound ? 'Mute sound' : 'Turn sound on'}>{sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}</button>
          <button onClick={fullscreen} className="btn-icon hidden sm:grid" aria-label="Full screen" title="Full screen"><Maximize2 className="w-5 h-5" /></button>
          <div ref={account.ref} className="relative ml-1">
            <button onClick={() => account.setOpen(!account.open)} aria-expanded={account.open} aria-label="Account menu" className="w-10 h-10 rounded-full bg-gold-500 text-black font-extrabold grid place-items-center">{user.name.charAt(0).toUpperCase()}</button>
            {account.open && <div className="cap-rise absolute top-full right-0 mt-1.5 w-64 rounded-xl border border-white/15 bg-obsidian-800 p-1.5 shadow-glass z-50">{accountItems}</div>}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-10">
        {/* Screens load on demand; navigation stays in place while they do. */}
        <Suspense fallback={<div role="status" className="grid place-items-center py-24"><Loader2 aria-label="Loading" className="w-8 h-8 animate-spin text-gold-400" /></div>}>{children}</Suspense>
      </main>
    </div>

    {/* Mobile tab bar */}
    {hasTournament && <nav aria-label="Main" className="app-tabs md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-obsidian-900/95 backdrop-blur-lg px-1 pt-1 pb-[max(env(safe-area-inset-bottom),0.35rem)]">
      <div className="flex items-end">
        <TabLink icon={Home} label="Home" active={mode === 'TOURNAMENT_OVERVIEW'} onClick={() => go('TOURNAMENT_OVERVIEW')} />
        <TabLink icon={Users} label="Players" active={mode === 'PLAYERS'} onClick={() => go('PLAYERS')} />
        <button onClick={() => go('AUCTIONEER')} aria-current={mode === 'AUCTIONEER' ? 'page' : undefined} className="flex-1 -mt-5 flex flex-col items-center gap-0.5 text-[11px] font-bold text-gold-400">
          <span className="w-14 h-14 rounded-full bg-gold-500 text-black grid place-items-center border-4 border-obsidian-900"><Gavel className="w-6 h-6" /></span>
          Auction
        </button>
        <TabLink icon={Shield} label="Teams" active={mode === 'TEAMS'} onClick={() => go('TEAMS')} />
        <TabLink icon={LayoutGrid} label="More" active={sheet} onClick={() => setSheet(true)} />
      </div>
    </nav>}

    {sheet && <div className="md:hidden fixed inset-0 z-50 bg-obsidian-950/80 backdrop-blur-sm" onClick={() => setSheet(false)}>
      <div role="dialog" aria-modal="true" aria-label="More" onClick={(event) => event.stopPropagation()} className="cap-rise absolute bottom-0 inset-x-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-obsidian-850 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl font-extrabold uppercase text-white">More</h2>
          <button onClick={() => setSheet(false)} aria-label="Close" className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        {groups.slice(1).map((group) => <div key={group.label} className="mb-4">
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
          <div className="grid grid-cols-3 gap-2">{group.items.map((item) => <button key={item.mode} onClick={() => go(item.mode)} className={`tile p-3 min-h-20 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold ${mode === item.mode ? 'text-gold-400' : 'text-slate-200'}`}><item.icon className="w-5 h-5" />{item.label}</button>)}</div>
        </div>)}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => { setSheet(false); onOpenWheel(); }} className="tile p-3 min-h-20 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-slate-200"><Sparkles className="w-5 h-5" />Wheel</button>
          <button onClick={() => { setSheet(false); onOpenBackup(); }} className="tile p-3 min-h-20 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-slate-200"><Database className="w-5 h-5" />Backup</button>
          <button onClick={() => go('ORGANIZER_PROFILE')} className="tile p-3 min-h-20 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-slate-200"><UserRound className="w-5 h-5" />Profile</button>
        </div>
      </div>
    </div>}
  </div>;
}

function RailLink({ item, active, compact, onClick }: { item: NavItem; active: boolean; compact: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button onClick={onClick} aria-current={active ? 'page' : undefined} title={item.label} aria-label={item.label} className={`relative w-full h-10 flex items-center gap-3 rounded-lg px-3 text-sm font-bold transition-colors ${active ? 'bg-gold-500 text-black' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
    <Icon className="w-5 h-5 shrink-0" />
    <span className={`truncate ${compact ? 'hidden' : 'hidden xl:inline'}`}>{item.label}</span>
  </button>;
}

function TabLink({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} aria-current={active ? 'page' : undefined} className={`flex-1 min-h-14 flex flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${active ? 'text-gold-400' : 'text-slate-400'}`}><Icon className="w-5 h-5" />{label}</button>;
}

function MenuRow({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${danger ? 'text-red-300 hover:bg-red-500/10' : 'text-slate-200 hover:bg-white/5 hover:text-white'}`}><Icon className="w-4 h-4 shrink-0" />{label}</button>;
}
