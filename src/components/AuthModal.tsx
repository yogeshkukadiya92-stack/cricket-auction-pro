import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  Trophy,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ORGANIZER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Login failed. Please check your credentials.');
        }
        localStorage.setItem('cap_current_user', JSON.stringify(data.user));
        setSuccessMsg(`Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 600);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name or organizer name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Registration failed. Please try again.');
        }
        localStorage.setItem('cap_current_user', JSON.stringify(data.user));
        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setMode('LOGIN');
    setError(null);
    // Direct submission trigger
    setLoading(true);
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: demoPass }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          localStorage.setItem('cap_current_user', JSON.stringify(data.user));
          setSuccessMsg(`Logged in as ${data.user.name}!`);
          setTimeout(() => {
            onSuccess(data.user);
            onClose();
          }, 500);
        } else {
          setError(data.error || 'Quick login failed.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Glow ambient header */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 pb-4 flex items-start justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Cricket Auction Pro
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'LOGIN'
                  ? 'Sign in to access your auctions and tournaments'
                  : 'Create an organizer account to host live auctions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name / Organizer Name <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Virat Patel (Premier League)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password <span className="text-amber-400">*</span>
              </label>
              {mode === 'LOGIN' && (
                <span className="text-[11px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'LOGIN' ? 'Sign In to Workspace' : 'Create My Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Section */}
        <div className="p-6 pt-2 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Quick 1-Click Demo Login
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@cricketauction.pro', 'admin123')}
              className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-left transition group"
            >
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-0.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">admin@cricketauction.pro</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('organizer@cricketauction.pro', 'user123')}
              className="p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-left transition group"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold mb-0.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Organizer</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">organizer@cricketauction.pro</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
