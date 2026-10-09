import React, { useState } from 'react';
import { ArrowLeft, Briefcase, KeyRound, LogOut, Shield, UserRound } from 'lucide-react';
import { Tournament, User } from '../types';

interface Props {
  user: User;
  tournaments: Tournament[];
  onUpdateUser: (user: User) => void;
  onBack: () => void;
  onAdmin: () => void;
  onPlayer: () => void;
  onLogout: () => void;
}
export function OrganizerProfileView({ user, tournaments, onUpdateUser, onBack, onAdmin, onPlayer, onLogout }: Props) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const request = async (url: string, method: string, body: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save changes');
    return data;
  };
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage(null);
    try { const data = await request('/api/auth/profile', 'PATCH', { name }); onUpdateUser(data.user); setMessage({ ok: true, text: 'Profile saved.' }); }
    catch (error) { setMessage({ ok: false, text: (error as Error).message }); }
    finally { setBusy(false); }
  };
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage(null);
    try { await request('/api/auth/password', 'POST', { currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setMessage({ ok: true, text: 'Password updated. Other devices have been signed out.' }); }
    catch (error) { setMessage({ ok: false, text: (error as Error).message }); }
    finally { setBusy(false); }
  };
  const mine = tournaments.filter(t => t.userId === user.id);
  const input = 'w-full rounded-xl bg-obsidian-950 border border-white/10 px-4 py-3 text-white focus:border-gold-400 outline-none';
  return <section className="max-w-xl mx-auto space-y-5">
    <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-300 min-h-11"><ArrowLeft className="w-4 h-4" /> Back to tournaments</button>
    <div className="glass-panel rounded-3xl p-6 flex gap-4 items-center">
      <div className="w-16 h-16 shrink-0 rounded-2xl bg-gold-500 text-black grid place-items-center text-2xl font-black">{user.name.charAt(0).toUpperCase()}</div>
      <div className="min-w-0"><h1 className="text-2xl font-display font-black">{user.role === 'ADMIN' ? 'Admin Profile' : 'Organizer Profile'}</h1><p className="text-slate-300 break-words">{user.name}</p><p className="text-sm text-gold-400">{user.status === 'ACTIVE' ? 'Active account' : 'Blocked account'}</p></div>
    </div>
    <div className="grid grid-cols-2 gap-3"><div className="glass-panel rounded-2xl p-4"><p className="text-xs text-slate-400">My tournaments</p><p className="text-2xl font-black text-gold-400">{mine.length}</p></div><div className="glass-panel rounded-2xl p-4"><p className="text-xs text-slate-400">Live tournaments</p><p className="text-2xl font-black text-emerald-400">{mine.filter(t => t.status === 'LIVE').length}</p></div></div>
    {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{message.text}</p>}
    <form onSubmit={saveName} className="glass-panel rounded-3xl p-5 space-y-4">
      <h2 className="font-bold flex gap-2 items-center"><Briefcase className="w-4 h-4 text-gold-400" /> Account details</h2>
      <label className="block text-sm space-y-2"><span>Full name</span><input value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="name" className={input} /></label>
      <label className="block text-sm space-y-2"><span>Email</span><input value={user.email} readOnly className={`${input} text-slate-400`} /></label>
      <button disabled={busy || !name.trim()} className="w-full rounded-xl bg-gold-500 text-black font-bold py-3 disabled:opacity-50">{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
    <div className="glass-panel rounded-3xl divide-y divide-white/10 overflow-hidden">
      {user.role === 'ADMIN' && <button onClick={onAdmin} className="w-full flex gap-3 items-center p-4 font-bold text-gold-400"><Shield className="w-5 h-5" /> Open Admin Panel</button>}
      <button onClick={onPlayer} className="w-full flex gap-3 items-center p-4 font-bold"><UserRound className="w-5 h-5" /> Player / User Profile</button>
      <button onClick={onLogout} disabled={busy} className="w-full flex gap-3 items-center p-4 font-bold text-red-300"><LogOut className="w-5 h-5" /> Sign out</button>
    </div>
    <form onSubmit={changePassword} className="glass-panel rounded-3xl p-5 space-y-4">
      <h2 className="font-bold flex gap-2 items-center"><KeyRound className="w-4 h-4 text-gold-400" /> Change password</h2>
      <label className="block text-sm space-y-2"><span>Current password</span><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required maxLength={128} autoComplete="current-password" className={input} /></label>
      <label className="block text-sm space-y-2"><span>New password</span><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={5} pattern="([0-9]{5}|.{12,128})" maxLength={128} autoComplete="new-password" placeholder="5 digits or at least 12 characters" className={input} /></label>
      <button disabled={busy} className="w-full rounded-xl border border-white/10 bg-white/5 font-bold py-3 disabled:opacity-50">Update password</button>
    </form>
  </section>;
}
