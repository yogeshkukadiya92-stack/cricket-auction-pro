import { Hint } from '../ui/kit';
import { processUploadedImage } from '../utils/imageUtils';
import { qrDataUrl } from '../utils/qr';
import { RegistrationResponsesView } from './RegistrationResponsesView';
import React, { useState } from 'react';
import { Tournament, CustomFormField, FormFieldType } from '../types';
import {
  Link,
  Copy,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  QrCode,
  Sliders,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  Smartphone,
  Upload,
} from 'lucide-react';

interface RegistrationFormBuilderProps {
  tournament: Tournament;
  onUpdateTournament: (updated: Tournament) => void;
  onPreviewPublicForm: () => void;
}

export const RegistrationFormBuilder: React.FC<RegistrationFormBuilderProps> = ({
  tournament,
  onUpdateTournament,
  onPreviewPublicForm,
}) => {
  const [tab, setTab] = useState<'settings' | 'responses'>('settings');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFormField[]>(
    tournament.customFields || []
  );

  // General Settings State
  const [registrationOpen, setRegistrationOpen] = useState(
    tournament.registrationOpen ?? true
  );
  const [fee, setFee] = useState(tournament.registrationFee ?? 0);
  const [deadline, setDeadline] = useState(
    tournament.registrationDeadline || ''
  );
  const [instructions, setInstructions] = useState(
    tournament.instructions ||
      'Please provide a valid WhatsApp number and upload a clear passport-size photo.'
  );
  const [upiId, setUpiId] = useState(tournament.upiId || '');
  const [gpayNumber, setGpayNumber] = useState(tournament.gpayNumber || '');
  const [gpayName, setGpayName] = useState(tournament.gpayName || tournament.name);
  const [gpayQrUrl, setGpayQrUrl] = useState(tournament.gpayQrUrl || '');
  const [paymentMandatory, setPaymentMandatory] = useState(tournament.paymentMandatory ?? false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Question Form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FormFieldType>('text');
  const [newRequired, setNewRequired] = useState(true);
  const [newOptionsStr, setNewOptionsStr] = useState('');

  // Public URL
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=register&tournamentId=${encodeURIComponent(tournament.id)}`
      : `http://localhost:5174/?mode=register&tournamentId=${encodeURIComponent(tournament.id)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🏏 *${tournament.name} • ${tournament.season}*\n\n🔥 Player Registration is NOW OPEN! Fill your cricket stats, photo, and details to enter the auction pool:\n\n👉 ${publicUrl}\n\n📌 Deadline: ${deadline}\n💰 Entry Fee: ₹${fee}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAddField = () => {
    if (!newLabel.trim()) return;

    const options =
      newType === 'select'
        ? newOptionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomFormField = {
      id: `field_${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      enabled: true,
      options: options && options.length > 0 ? options : ['Option 1', 'Option 2'],
    };

    const updated = [...customFields, newField];
    setCustomFields(updated);
    setNewLabel('');
    setNewOptionsStr('');

    // Auto save to tournament
    onUpdateTournament({
      ...tournament,
      customFields: updated,
    });
  };

  const handleDeleteField = (id: string) => {
    const updated = customFields.filter((f) => f.id !== id);
    setCustomFields(updated);
    onUpdateTournament({
      ...tournament,
      customFields: updated,
    });
  };

  const handleToggleRequired = (id: string) => {
    const updated = customFields.map((f) =>
      f.id === id ? { ...f, required: !f.required } : f
    );
    setCustomFields(updated);
    onUpdateTournament({
      ...tournament,
      customFields: updated,
    });
  };

  const handleSaveAllSettings = () => {
    onUpdateTournament({
      ...tournament,
      registrationOpen,
      registrationFee: Number(fee),
      registrationDeadline: deadline,
      instructions,
      upiId,
      gpayNumber,
      gpayName,
      gpayQrUrl,
      paymentMandatory,
      customFields,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedImage(file, 1280, setGpayQrUrl);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex gap-2" role="tablist" aria-label="Registration form">
        {(['settings', 'responses'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`btn ${tab === value ? 'bg-white text-black' : 'btn-ghost'}`}>{value === 'settings' ? 'Form' : 'Responses'}</button>)}
      </div>
      {tab === 'responses' ? <RegistrationResponsesView key={tournament.id} tournamentId={tournament.id} embedded /> : <>
      {/* Share the form */}
      <section className="panel pitch-stripes p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => setRegistrationOpen(!registrationOpen)} aria-pressed={registrationOpen} className={`btn ${registrationOpen ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border border-red-500/40 text-red-200'}`}>
            {registrationOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}{registrationOpen ? 'Open for sign-ups' : 'Sign-ups closed'}
          </button>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopyLink} className="btn btn-primary">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy link'}</button>
            <button onClick={handleShareWhatsApp} className="btn btn-ghost"><Share2 className="w-4 h-4" />WhatsApp</button>
            <button onClick={() => setShowQr(!showQr)} aria-expanded={showQr} className="btn btn-ghost"><QrCode className="w-4 h-4" />QR code</button>
            <button onClick={onPreviewPublicForm} className="btn btn-ghost"><Eye className="w-4 h-4" />Preview</button>
          </div>
        </div>
        <input type="text" readOnly aria-label="Sign-up link" value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="field text-xs text-slate-300" />
        {showQr && <div className="cap-rise flex flex-col items-center gap-2 pt-1">
          <img src={qrDataUrl(publicUrl)} alt="QR code for the sign-up form" className="w-52 h-52 rounded-xl bg-white" />
          <a href={qrDataUrl(publicUrl)} download={`${tournament.name.replace(/[^a-z0-9]+/gi, '-')}-signup-qr.svg`} className="btn btn-ghost">Download QR</a>
        </div>}
      </section>

      {/* 2. General Form Settings (Fee, Deadline, UPI, Status) */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
        <h2 className="font-display text-2xl font-extrabold uppercase text-white">Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Fee (₹)
            </label>
            <input
              type="number"
              step="50"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              placeholder="e.g. 500 (0 for Free)"
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Last date
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Instructions shown on the form
          </label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-obsidian-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-gold-400 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* 2.5 Google Pay & UPI Payment Settings */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-white">Payment</h2>
          </div>
          <button
            type="button"
            onClick={() => setPaymentMandatory(!paymentMandatory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              paymentMandatory
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            {paymentMandatory ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Receipt required</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span>Receipt optional</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              GPay number
            </label>
            <input
              type="text"
              value={gpayNumber}
              onChange={(e) => setGpayNumber(e.target.value)}
              placeholder="e.g. +91 98250 12345"
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              UPI ID
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9825012345@oksbi"
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Account name
            </label>
            <input
              type="text"
              value={gpayName}
              onChange={(e) => setGpayName(e.target.value)}
              placeholder="e.g. GPL Cricket Committee"
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Custom QR Code Upload or Default */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
          {gpayQrUrl ? (
            <img
              src={gpayQrUrl}
              alt="Custom GPay QR"
              className="w-24 h-24 rounded-xl object-contain bg-white p-1 border border-white/20 shadow"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white flex flex-col items-center justify-center p-2 shadow text-black text-center font-bold text-[10px] leading-tight">
              <span className="text-lg mb-0.5">📱</span>
              <span>Auto QR</span>
              <span className="text-[9px] text-emerald-700 font-mono mt-0.5 font-black">₹{fee}</span>
            </div>
          )}

          <div className="space-y-1.5 flex-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-white">Your own UPI QR (optional)</h3>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
              {gpayQrUrl && (
                <button
                  type="button"
                  onClick={() => setGpayQrUrl('')}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Google Forms Style Dynamic Custom Fields Builder */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-white">Extra questions <Hint text="Name, photo, mobile, role and playing style are always asked." /></h2>
          </div>
        </div>

        {/* Existing Custom Fields List */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 block">
            Added ({customFields.length})
          </span>

          {customFields.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center rounded-2xl bg-white/[0.02]">
              None yet
            </p>
          ) : (
            <div className="space-y-2.5">
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className="p-4 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-wrap items-center justify-between gap-3 hover:border-gold-400/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-white/5 text-gold-400 text-xs font-mono font-bold uppercase">
                      {field.type}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-400 text-xs font-extrabold">*Required</span>
                        )}
                      </h4>
                      {field.type === 'select' && field.options && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleRequired(field.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                        field.required
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {field.required ? 'Mandatory' : 'Optional'}
                    </button>

                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Question Section */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 block flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-gold-400" />
            Add Custom Question
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Question Title
              </label>
              <input
                type="text"
                placeholder="e.g. Aadhaar Card No, Address, Previous Club..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Input Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as FormFieldType)}
                className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="text">Text (Short Answer)</option>
                <option value="number">Number</option>
                <option value="select">Dropdown (Options List)</option>
                <option value="textarea">Paragraph (Long Answer)</option>
                <option value="checkbox">Checkbox (Yes/No Confirmation)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pb-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded border-white/20 text-gold-500 focus:ring-0"
                />
                <span>Required?</span>
              </label>
            </div>
          </div>

          {/* Options for dropdown */}
          {newType === 'select' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Enter Options (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Option 1, Option 2, Option 3"
                value={newOptionsStr}
                onChange={(e) => setNewOptionsStr(e.target.value)}
                className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-gold-400 focus:outline-none font-mono"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAddField}
              disabled={!newLabel.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                newLabel.trim()
                  ? 'bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>

        {/* Save All Changes Button */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <span className="text-xs text-slate-400">Live on your form as soon as you save.</span>

          <button
            onClick={handleSaveAllSettings}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {savedSuccess ? 'Saved Successfully!' : 'Save Form Settings'}
          </button>
        </div>
      </div>
      </>}
    </div>
  );
};
