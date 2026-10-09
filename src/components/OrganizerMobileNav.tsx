import React from 'react';
import { ClipboardList, Shield, Trophy, UserRound, Users } from 'lucide-react';
import { User, ViewMode } from '../types';

export function OrganizerMobileNav({ user, mode, onSelect }: { user: User; mode: ViewMode; onSelect: (mode: ViewMode) => void }) {
  const tabs = [
    { mode: 'TOURNAMENTS' as ViewMode, label: 'Tournaments', icon: Trophy },
    { mode: 'PLAYERS' as ViewMode, label: 'Players', icon: Users },
    { mode: 'FORM_BUILDER' as ViewMode, label: 'Reg. Form', icon: ClipboardList },
    ...(user.role === 'ADMIN' ? [{ mode: 'ADMIN_PANEL' as ViewMode, label: 'Admin', icon: Shield }] : []),
    { mode: 'ORGANIZER_PROFILE' as ViewMode, label: 'Profile', icon: UserRound },
  ];
  return <nav aria-label="Organizer mobile navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-obsidian-950/95 backdrop-blur-xl border-t border-white/10 pb-[max(env(safe-area-inset-bottom),0.5rem)] px-1 pt-1">
    <div className="flex max-w-xl mx-auto">{tabs.map(({ mode: value, label, icon: Icon }) => <button key={value} onClick={() => { onSelect(value); window.scrollTo({ top: 0 }); }} aria-current={mode === value ? 'page' : undefined} className={`flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-bold rounded-xl ${mode === value ? 'bg-gold-500/10 text-gold-400' : 'text-slate-400'}`}><Icon className="w-5 h-5" /><span>{label}</span></button>)}</div>
  </nav>;
}
