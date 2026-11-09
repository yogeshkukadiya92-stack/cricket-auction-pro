import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError(null);
    setPassword('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); };
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const registering = mode === 'REGISTER';
  const switchMode = (next: typeof mode) => { setMode(next); setPassword(''); setError(null); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (registering && !/^\d{5}$/.test(password) && password.length < 12) { setError('Use exactly 5 digits, or at least 12 characters.'); return; }
    setLoading(true);
    try {
      const response = await fetch(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registering
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password, ...(mode === 'ADMIN_LOGIN' ? { loginAs: 'ADMIN' } : {}) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Please try again.');
      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError((err as Error).message === 'Failed to fetch' ? 'No connection. Check your internet and retry.' : (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-obsidian-950/85 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="cap-rise relative w-full max-w-sm rounded-3xl border border-white/15 bg-obsidian-850 p-6 text-white">
        <button type="button" onClick={onClose} aria-label="Close" className="btn-icon absolute top-3 right-3"><X className="w-5 h-5" /></button>
        <h2 id="auth-title" className="font-display text-4xl font-extrabold uppercase leading-none pr-10">
          {mode === 'ADMIN_LOGIN' ? 'Admin sign in' : registering ? 'Create account' : 'Sign in'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
          {registering && <label className="block"><span className="field-label">Your or your committee's name</span>
            <input type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </label>}
          <label className="block"><span className="field-label">Email</span>
            <input type="email" id="organizer-login-email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </label>
          <label className="block"><span className="field-label">Password{registering && <span className="font-medium text-slate-400"> · 5 digits or 12+ characters</span>}</span>
            <span className="relative block">
              <input type={showPassword ? 'text' : 'password'} id="organizer-login-password" required maxLength={128} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="field pr-11" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0 top-0 grid place-items-center w-11 h-11 text-slate-400 hover:text-white">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </span>
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-12 text-base">
            {loading ? <Loader2 aria-label="Please wait" className="w-5 h-5 animate-spin" /> : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {mode !== 'ADMIN_LOGIN' && <button type="button" onClick={() => switchMode(registering ? 'LOGIN' : 'REGISTER')} className="mt-3 w-full min-h-11 text-sm font-bold text-gold-400 hover:text-gold-300">
          {registering ? 'I already have an account' : 'New here? Create an account'}
        </button>}
        {mode === 'ADMIN_LOGIN' && <button type="button" onClick={() => switchMode('LOGIN')} className="mt-3 w-full min-h-11 text-sm font-bold text-slate-400 hover:text-white">Organizer sign in</button>}
      </div>
    </div>,
    document.body,
  );
};
