import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { playerApi, PlayerApiError } from '../../services/playerApi';

type Step = 'MOBILE' | 'LOGIN' | 'SETUP' | 'NOT_REGISTERED' | 'BLOCKED';
const MIN_PASSWORD = 8;

interface PlayerAuthScreenProps {
  onSignedIn: () => void;
  onBack: () => void;
}

export const PlayerAuthScreen: React.FC<PlayerAuthScreenProps> = ({ onSignedIn, onBack }) => {
  const [step, setStep] = useState<Step>('MOBILE');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const digits = mobile.replace(/\D/g, '').slice(-10);
  const mobileValid = /^[6-9]\d{9}$/.test(digits);

  const run = async (task: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await task(); } catch (err) { setError(err instanceof PlayerApiError ? err.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  const submitMobile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileValid) { setError('Enter your 10-digit mobile number used during registration.'); return; }
    void run(async () => {
      const { next } = await playerApi.check(digits);
      setPassword(''); setConfirm('');
      setStep(next === 'LOGIN' ? 'LOGIN' : next === 'SETUP' ? 'SETUP' : next === 'BLOCKED' ? 'BLOCKED' : 'NOT_REGISTERED');
    });
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'SETUP') {
      if (password.length < MIN_PASSWORD) { setError(`Password must be at least ${MIN_PASSWORD} characters.`); return; }
      if (password !== confirm) { setError('Both passwords must match.'); return; }
    }
    void run(async () => {
      if (step === 'SETUP') await playerApi.setup(digits, password);
      else await playerApi.login(digits, password);
      onSignedIn();
    });
  };

  // Subtle 3D tilt that follows the pointer (desktop / tablets with a mouse).
  const tilt = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cardRef.current.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
  };
  const resetTilt = () => { if (cardRef.current) cardRef.current.style.transform = ''; };

  const goBack = () => {
    setError('');
    if (step === 'MOBILE') onBack(); else setStep('MOBILE');
  };

  const inputClass = 'w-full bg-obsidian-950/70 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-gold-400/70 focus:ring-4 focus:ring-gold-500/15';

  return (
    <main className="relative min-h-screen overflow-hidden bg-obsidian-950 text-white flex flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gold-500/20 blur-3xl animate-beam" />
        <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-electric-cyan/15 blur-3xl animate-beam [animation-delay:-3s]" />
        <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-electric-purple/15 blur-3xl animate-beam [animation-delay:-6s]" />
      </div>

      <header className="relative z-10 px-5 pt-5">
        <button id="player-auth-back" type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 active:scale-95 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </header>

      <section className="relative z-10 flex-1 grid place-items-center px-5 py-8 perspective-1000">
        <div
          ref={cardRef}
          onPointerMove={tilt}
          onPointerLeave={resetTilt}
          className="w-full max-w-md preserve-3d transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-4xl shadow-glow-gold animate-float">🏏</div>
            <h1 className="font-display text-3xl font-black tracking-tight bg-gradient-to-r from-gold-400 via-amber-200 to-white bg-clip-text text-transparent">
              Player Login
            </h1>
            <p className="text-slate-400 text-sm mt-2">Your registrations, live auctions & every player's profile — in one place.</p>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 shadow-glass">
            {step === 'MOBILE' && (
              <form onSubmit={submitMobile} className="space-y-5" noValidate>
                <label htmlFor="player-mobile" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Registered mobile number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">+91</span>
                  <input
                    id="player-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus
                    value={mobile} onChange={e => setMobile(e.target.value.replace(/[^\d\s+]/g, '').slice(0, 14))}
                    placeholder="98765 43210" className={`${inputClass} pl-[5.25rem] tracking-wider`}
                  />
                </div>
                <p className="text-xs text-slate-500">Use the same number you entered on the tournament registration form.</p>
                <SubmitButton id="player-continue" busy={busy} disabled={!mobileValid}>Continue</SubmitButton>
              </form>
            )}

            {(step === 'LOGIN' || step === 'SETUP') && (
              <form onSubmit={submitPassword} className="space-y-4" noValidate>
                <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Mobile</div>
                    <div className="font-semibold tracking-wider">+91 {digits.slice(0, 5)} {digits.slice(5)}</div>
                  </div>
                  <button type="button" onClick={goBack} className="text-xs font-bold text-gold-400">Change</button>
                </div>

                {step === 'SETUP' && (
                  <div className="flex gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-sm text-emerald-200">
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>Registration found! Create a password to activate your player account.</span>
                  </div>
                )}

                <PasswordField id="player-password" label={step === 'SETUP' ? 'Create password' : 'Password'} value={password} onChange={setPassword}
                  show={showPassword} onToggle={() => setShowPassword(s => !s)} autoComplete={step === 'SETUP' ? 'new-password' : 'current-password'} className={inputClass} />
                {step === 'SETUP' && (
                  <PasswordField id="player-password-confirm" label="Confirm password" value={confirm} onChange={setConfirm}
                    show={showPassword} onToggle={() => setShowPassword(s => !s)} autoComplete="new-password" className={inputClass} />
                )}
                {step === 'SETUP' && <p className="text-xs text-slate-500">At least {MIN_PASSWORD} characters.</p>}

                <SubmitButton id="player-submit" busy={busy} disabled={!password}>
                  {step === 'SETUP' ? 'Create account & sign in' : 'Sign in'}
                </SubmitButton>
              </form>
            )}

            {(step === 'NOT_REGISTERED' || step === 'BLOCKED') && (
              <div className="text-center space-y-4 py-2">
                <div className="text-5xl">{step === 'BLOCKED' ? '🔒' : '📝'}</div>
                <h2 className="font-display text-xl font-bold">{step === 'BLOCKED' ? 'Account blocked' : 'No registration found'}</h2>
                <p className="text-sm text-slate-400">
                  {step === 'BLOCKED'
                    ? 'This player account has been blocked. Please contact your tournament organizer.'
                    : <>We couldn't find any tournament registration for <b className="text-white">+91 {digits}</b>. Register through your tournament's link first, then sign in here.</>}
                </p>
                <button type="button" onClick={goBack} className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 font-bold active:scale-[0.98] transition">Try another number</button>
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">{error}</p>}
          </div>
        </div>
      </section>
    </main>
  );
};

const SubmitButton: React.FC<{ id: string; busy: boolean; disabled?: boolean; children: React.ReactNode }> = ({ id, busy, disabled, children }) => (
  <button
    id={id} type="submit" disabled={busy || disabled}
    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-gold-400 to-gold-600 py-4 font-display text-base font-black text-obsidian-950 shadow-glow-gold transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
  >
    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    <span className="relative inline-flex items-center justify-center gap-2">
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{children}<ArrowRight className="w-5 h-5" /></>}
    </span>
  </button>
);

interface PasswordFieldProps {
  id: string; label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; autoComplete: string; className: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange, show, onToggle, autoComplete, className }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} maxLength={128} className={className} />
      <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  </div>
);
