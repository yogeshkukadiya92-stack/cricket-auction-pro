import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, CircleHelp, Copy, Info, X } from 'lucide-react';

/* ---------- Toasts and confirm dialogs (replace browser alert / confirm) ---------- */

type Tone = 'ok' | 'warn' | 'info';
interface Toast { id: number; text: string; tone: Tone }
interface Ask { title: string; body?: string; confirmLabel?: string; danger?: boolean; resolve: (value: boolean) => void }

let pushToast: ((toast: Toast) => void) | null = null;
let pushAsk: ((ask: Ask) => void) | null = null;
let toastId = 0;

/** Shows a short message that disappears by itself. */
export const notify = (text: string, tone: Tone = 'info') => {
  const toast = { id: ++toastId, text, tone };
  if (pushToast) pushToast(toast);
};

/** Asks a yes/no question in the app's own dialog. */
export const ask = (options: Omit<Ask, 'resolve'>) => new Promise<boolean>((resolve) => {
  if (pushAsk) pushAsk({ ...options, resolve });
  else resolve(window.confirm(options.title));
});

export const copyText = async (text: string, done = 'Link copied') => {
  try {
    await navigator.clipboard.writeText(text);
    notify(done, 'ok');
    return true;
  } catch {
    notify('Could not copy. Long-press the link to copy it.', 'warn');
    return false;
  }
};

export function FeedbackHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [question, setQuestion] = useState<Ask | null>(null);
  useEffect(() => {
    pushToast = (toast) => {
      setToasts((list) => [...list.slice(-2), toast]);
      window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== toast.id)), 3600);
    };
    pushAsk = setQuestion;
    return () => { pushToast = null; pushAsk = null; };
  }, []);
  const answer = (value: boolean) => { question?.resolve(value); setQuestion(null); };
  useEffect(() => {
    if (!question) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question]);
  return <>
    <div className="fixed z-[70] bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md space-y-2 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'ok' ? CheckCircle2 : toast.tone === 'warn' ? AlertTriangle : Info;
        return <div key={toast.id} role="status" className="cap-rise flex items-start gap-2.5 rounded-xl border border-white/15 bg-obsidian-800 px-4 py-3 text-sm font-semibold text-white shadow-glass">
          <Icon className={`w-5 h-5 shrink-0 ${toast.tone === 'ok' ? 'text-gold-400' : toast.tone === 'warn' ? 'text-amber-400' : 'text-slate-300'}`} />
          <span>{toast.text}</span>
        </div>;
      })}
    </div>
    {question && <div className="fixed inset-0 z-[80] grid place-items-center bg-obsidian-950/80 backdrop-blur-sm p-4" onClick={() => answer(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="ask-title" onClick={(event) => event.stopPropagation()} className="cap-rise w-full max-w-sm rounded-3xl border border-white/15 bg-obsidian-850 p-5 shadow-glass">
        <h2 id="ask-title" className="font-display text-2xl font-extrabold text-white">{question.title}</h2>
        {question.body && <p className="mt-1.5 text-sm text-slate-300">{question.body}</p>}
        <div className="mt-5 flex gap-2">
          <button className="btn btn-ghost flex-1" autoFocus onClick={() => answer(false)}>Cancel</button>
          <button className={`btn flex-1 ${question.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => answer(true)}>{question.confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>}
  </>;
}

/* ---------- Help on demand: long explanations live behind a small button ---------- */

export function Hint({ text, label = 'What is this?' }: { text: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return <span ref={ref} className="relative inline-flex align-middle">
    <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)} className="grid place-items-center w-6 h-6 rounded-full text-slate-400 hover:text-gold-400 transition-colors">
      <CircleHelp className="w-4 h-4" />
    </button>
    {open && <span role="tooltip" className="cap-rise absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-64 max-w-[80vw] rounded-xl border border-white/15 bg-obsidian-800 p-3 text-xs font-medium normal-case tracking-normal leading-relaxed text-slate-200 shadow-glass">{text}</span>}
  </span>;
}

function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handle = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) onOutside(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onOutside(); };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', key); };
  }, [active]);
}

/* ---------- Page header: a title and its actions, on one line ---------- */

export function PageHead({ title, count, hint, actions, eyebrow }: { title: string; count?: React.ReactNode; hint?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }) {
  return <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
    <div className="min-w-0">
      {eyebrow && <p className="caption text-[11px] font-extrabold text-gold-400 mb-0.5">{eyebrow}</p>}
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight text-white flex items-center gap-2 flex-wrap">
        {title}
        {count !== undefined && <span className="text-slate-500">{count}</span>}
        {hint && <Hint text={hint} />}
      </h1>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

/* ---------- Scoreboard tile ---------- */

export function Tile({ label, value, sub, tone = 'default', onClick, active, small }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'lime' | 'green' | 'red'; onClick?: () => void; active?: boolean; small?: boolean }) {
  const color = tone === 'lime' ? 'text-gold-400' : tone === 'green' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-white';
  const body = <>
    <span className="block caption text-[11px] font-bold text-slate-400">{label}</span>
    <span className={`score block mt-1 leading-tight truncate ${small ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'} ${color}`}>{value}</span>
    {sub && <span className="block mt-1.5 text-xs text-slate-400 truncate">{sub}</span>}
  </>;
  const className = `tile block w-full min-w-0 text-left ${small ? 'p-3' : 'p-4'} ${active ? 'ring-1 ring-gold-400' : ''}`;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={active} className={`${className} hover:border-white/25 transition-colors`}>{body}</button> : <div className={className}>{body}</div>;
}

/* ---------- Dropdown of secondary actions ---------- */

export interface MenuItem { label: string; icon?: React.ElementType; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean }

export function Menu({ label, icon: Icon, items, align = 'right', className = 'btn btn-ghost' }: { label: string; icon?: React.ElementType; items: MenuItem[]; align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  return <div ref={ref} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className={className}>
      {Icon && <Icon className="w-4 h-4" />}{label}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="menu" className={`cap-rise absolute z-50 top-full mt-1.5 min-w-56 rounded-xl border border-white/15 bg-obsidian-800 p-1.5 shadow-glass ${align === 'right' ? 'right-0' : 'left-0'}`}>
      {items.map((item) => {
        const ItemIcon = item.icon;
        const cls = `w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-40 ${item.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-slate-200 hover:bg-white/5 hover:text-white'}`;
        const content = <>{ItemIcon && <ItemIcon className="w-4 h-4 shrink-0" />}{item.label}</>;
        return item.href
          ? <a key={item.label} role="menuitem" href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={cls}>{content}</a>
          : <button key={item.label} role="menuitem" type="button" disabled={item.disabled} onClick={() => { setOpen(false); item.onClick?.(); }} className={cls}>{content}</button>;
      })}
    </div>}
  </div>;
}

export function CopyButton({ text, label = 'Copy link', done = 'Link copied', className = 'btn btn-ghost' }: { text: string; label?: string; done?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className={className} onClick={async () => {
    if (await copyText(text, done)) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  }}>
    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : label}
  </button>;
}

export function Empty({ icon: Icon, title, actions }: { icon: React.ElementType; title: string; actions?: React.ReactNode }) {
  return <div className="panel p-10 text-center">
    <Icon className="w-10 h-10 mx-auto text-slate-500" />
    <h2 className="mt-3 font-display text-3xl font-extrabold text-white">{title}</h2>
    {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
  </div>;
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return <button type="button" aria-label="Close" onClick={onClick} className="btn-icon"><X className="w-5 h-5" /></button>;
}

export const publicLink = (mode: 'register' | 'registrations' | 'summary' | 'obs', tournamentId: string) =>
  `${window.location.origin}${window.location.pathname}?mode=${mode}&tournamentId=${encodeURIComponent(tournamentId)}`;
