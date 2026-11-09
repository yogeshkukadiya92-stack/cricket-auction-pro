import React from 'react';
import { ArrowRight, Briefcase, Gavel, Shield, UserRound } from 'lucide-react';

interface LandingScreenProps {
  onPlayer: () => void;
  onOrganizer: () => void;
  onAdmin: () => void;
  children?: React.ReactNode;
}

/** Entry screen: choose Player (mobile login) or Organizer (e-mail login). */
export const LandingScreen: React.FC<LandingScreenProps> = ({ onPlayer, onOrganizer, onAdmin, children }) => (
  <main className="relative min-h-[100dvh] overflow-hidden bg-obsidian-950 text-white pitch-stripes flex flex-col">
    <header className="relative z-10 flex items-center gap-2.5 px-5 sm:px-10 pt-6">
      <span className="w-9 h-9 rounded-lg bg-gold-500 text-black grid place-items-center"><Gavel className="w-5 h-5" /></span>
      <span className="font-display text-2xl font-extrabold uppercase">Auction Pro</span>
    </header>

    <section className="relative z-10 flex-1 grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-16 items-center px-5 sm:px-10 py-10 max-w-7xl w-full mx-auto">
      <div className="cap-rise">
        <h1 className="font-display font-black uppercase leading-[0.86] text-[clamp(4rem,12vw,10rem)]">
          Bid.<br />Hammer.<br /><span className="text-gold-400">Sold.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-300">Your league's player auction, live on every screen.</p>
      </div>

      <div className="w-full max-w-md lg:ml-auto space-y-3 cap-rise" style={{ animationDelay: '80ms' }}>
        <button id="landing-organizer-login" type="button" onClick={onOrganizer} className="group w-full flex items-center gap-4 rounded-3xl bg-gold-500 hover:bg-gold-400 text-black p-5 text-left transition-colors">
          <Briefcase className="w-7 h-7 shrink-0" />
          <span className="flex-1 font-display text-3xl font-extrabold uppercase leading-none">I'm an organizer</span>
          <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
        </button>
        <button id="landing-player-login" type="button" onClick={onPlayer} className="group w-full flex items-center gap-4 rounded-3xl border border-white/15 bg-obsidian-850 hover:bg-obsidian-800 p-5 text-left transition-colors">
          <UserRound className="w-7 h-7 shrink-0 text-gold-400" />
          <span className="flex-1 font-display text-3xl font-extrabold uppercase leading-none">I'm a player</span>
          <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
        </button>
        <button id="landing-admin-login" type="button" onClick={onAdmin} className="inline-flex items-center gap-2 min-h-11 px-2 text-sm font-semibold text-slate-400 hover:text-white">
          <Shield className="w-4 h-4" />Admin sign in
        </button>
      </div>
    </section>
    {children}
  </main>
);
