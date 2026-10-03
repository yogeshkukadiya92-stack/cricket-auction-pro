import React, { useRef } from 'react';
import { Briefcase, ChevronRight, Radio, Trophy, UserRound, Users } from 'lucide-react';

interface LandingScreenProps {
  onPlayer: () => void;
  onOrganizer: () => void;
  children?: React.ReactNode;
}

/** Entry screen: choose Player (mobile login) or Organizer (e-mail login). */
export const LandingScreen: React.FC<LandingScreenProps> = ({ onPlayer, onOrganizer, children }) => (
  <main className="relative min-h-screen overflow-hidden bg-obsidian-950 text-white flex flex-col">
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-gold-500/15 blur-3xl animate-beam" />
      <div className="absolute bottom-0 -left-32 w-[26rem] h-[26rem] rounded-full bg-electric-blue/15 blur-3xl animate-beam [animation-delay:-4s]" />
      <div className="absolute bottom-10 -right-32 w-[24rem] h-[24rem] rounded-full bg-electric-purple/15 blur-3xl animate-beam [animation-delay:-2s]" />
    </div>

    <section className="relative z-10 flex-1 flex flex-col justify-center px-5 py-10 max-w-md w-full mx-auto">
      <div className="text-center mb-10 cap-rise">
        <div className="mx-auto mb-6 w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-5xl shadow-glow-gold animate-float">🏏</div>
        <h1 className="font-display text-4xl font-black tracking-tight">
          Cricket <span className="bg-gradient-to-r from-gold-400 to-amber-200 bg-clip-text text-transparent">Auction Pro</span>
        </h1>
        <p className="text-slate-400 mt-3">Live player auctions for every league.</p>
        <div className="flex justify-center gap-4 mt-5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Radio className="w-3.5 h-3.5 text-red-400" /> Live bids</span>
          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-cyan-400" /> Player profiles</span>
          <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-gold-400" /> Squads</span>
        </div>
      </div>

      <div className="space-y-3">
        <ChoiceCard
          id="landing-player-login" onClick={onPlayer} icon={UserRound} delay={80}
          title="I'm a Player" text="Sign in with your registered mobile number"
          className="from-gold-400 to-gold-600 text-obsidian-950" primary
        />
        <ChoiceCard
          id="landing-organizer-login" onClick={onOrganizer} icon={Briefcase} delay={160}
          title="I'm an Organizer" text="Run tournaments, teams and the auction desk"
          className="from-white/[0.08] to-white/[0.02] text-white"
        />
      </div>
    </section>
    {children}
  </main>
);

interface ChoiceCardProps {
  id: string; title: string; text: string; icon: React.ElementType;
  onClick: () => void; className: string; primary?: boolean; delay: number;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ id, title, text, icon: Icon, onClick, className, primary, delay }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-2px)`;
  };
  return (
    <button
      ref={ref} id={id} type="button" onClick={onClick} onPointerMove={move} onPointerLeave={() => { if (ref.current) ref.current.style.transform = ''; }}
      style={{ animationDelay: `${delay}ms` }}
      className={`cap-rise group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br ${className} ${primary ? 'shadow-glow-gold' : 'border border-white/10 backdrop-blur-xl'} p-5 text-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]`}
    >
      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center gap-4">
        <span className={`w-12 h-12 rounded-2xl grid place-items-center ${primary ? 'bg-obsidian-950/15' : 'bg-white/10'}`}><Icon className="w-6 h-6" /></span>
        <span className="flex-1">
          <span className="block font-display text-lg font-black">{title}</span>
          <span className={`block text-sm ${primary ? 'text-obsidian-950/70' : 'text-slate-400'}`}>{text}</span>
        </span>
        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
};
