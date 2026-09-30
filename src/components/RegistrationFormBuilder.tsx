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
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFormField[]>(
    tournament.customFields || []
  );

  // General Settings State
  const [registrationOpen, setRegistrationOpen] = useState(
    tournament.registrationOpen ?? true
  );
  const [fee, setFee] = useState(tournament.registrationFee ?? 500);
  const [deadline, setDeadline] = useState(
    tournament.registrationDeadline || '2026-10-15'
  );
  const [instructions, setInstructions] = useState(
    tournament.instructions ||
      'કૃપા કરીને સાચો WhatsApp નંબર અને પાસપોર્ટ સાઈઝનો સ્પષ્ટ ફોટો અપલોડ કરો.'
  );
  const [upiId, setUpiId] = useState(tournament.upiId || 'cricketgpl@oksbi');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Question Form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FormFieldType>('text');
  const [newRequired, setNewRequired] = useState(true);
  const [newOptionsStr, setNewOptionsStr] = useState('');

  // Public URL
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=register`
      : 'http://localhost:5174/?mode=register';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🏏 *${tournament.name} • ${tournament.season}*\n\n🔥 પ્લેયર રજીસ્ટ્રેશન શરૂ થઈ ગયું છે! તમારો ફોટો, ક્રિકેટ સ્ટેટ્સ અને વિગતો ભરીને ટુર્નામેન્ટ ઓક્શનમાં સામેલ થવા માટે નીચેની લિંક પર ક્લિક કરો:\n\n👉 ${publicUrl}\n\n📌 છેલ્લી તારીખ: ${deadline}\n💰 એન્ટ્રી ફી: ₹${fee}`;
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
      customFields,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Public Shareable Link Hero Card */}
      <div className="p-6 lg:p-8 rounded-3xl bg-gradient-to-r from-obsidian-850 via-obsidian-900 to-obsidian-850 border-2 border-gold-400/50 shadow-glow-gold relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Link className="w-48 h-48 text-gold-400" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-gold-500/20 text-gold-400 border border-gold-400/30">
              SHAREABLE PLAYER REGISTRATION LINK
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  registrationOpen
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {registrationOpen ? '● ACCEPTING RESPONSES' : '● REGISTRATION CLOSED'}
              </span>
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-white font-display">
            પ્લેયર રજીસ્ટ્રેશન લિંક શેર કરો
          </h2>
          <p className="text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed">
            આ લિંક તમે WhatsApp ગ્રૂપ, ઇન્સ્ટાગ્રામ કે સોશિયલ મીડિયા પર શેર કરી શકો છો. ખેલાડીઓ પોતાના મોબાઈલમાંથી જ આ ફોર્મ ખોલીને નામ, ફોટો, અને તમારી માંગેલી બધી જ વિગતો ભરી શકશે.
          </p>

          {/* Link Box with Copy Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl bg-obsidian-950 border border-white/10">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 bg-transparent px-3 py-2 text-xs font-mono font-bold text-gold-400 select-all focus:outline-none truncate"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-glow-emerald active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                onClick={() => setShowQr(!showQr)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all"
                title="Show QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QR Code Container */}
          {showQr && (
            <div className="p-4 rounded-2xl bg-obsidian-950 border border-gold-400/30 flex flex-col items-center justify-center gap-3 animate-in fade-in">
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                {/* SVG QR Code Simulation */}
                <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" fill="white" />
                  <path d="M10 10h30v30H10zM15 15v20h20V15zM20 20h10v10H20z" fill="black" />
                  <path d="M60 10h30v30H60zM65 15v20h20V15zM70 20h10v10H70z" fill="black" />
                  <path d="M10 60h30v30H10zM15 65v20h20V65zM20 70h10v10H20z" fill="black" />
                  <path d="M50 15h5v5h-5zM50 30h5v10h-5zM45 45h10v5H45zM65 50h5v5h-5zM60 65h10v5H60zM75 60h15v5H75zM70 75h5v15h-5zM85 80h5v10h-5zM50 75h5v5h-5zM35 50h5v5h-5zM25 45h5v5h-5z" fill="black" />
                </svg>
              </div>
              <p className="text-xs text-slate-300 font-bold">
                પ્લેયર્સ મોબાઈલ કેમેરાથી આ QR સ્કેન કરીને સીધું રજીસ્ટ્રેશન ફોર્મ ખોલી શકે છે.
              </p>
            </div>
          )}

          {/* Preview Public Form Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onPreviewPublicForm}
              className="flex items-center gap-2 text-xs font-bold text-gold-400 hover:text-gold-300 underline underline-offset-4"
            >
              <Eye className="w-4 h-4" />
              પ્લેયર રજીસ્ટ્રેશન ફોર્મ કેવું દેખાશે તે જુઓ (Live Preview)
            </button>
          </div>
        </div>
      </div>

      {/* 2. General Form Settings (Fee, Deadline, UPI, Status) */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
            <Sliders className="w-4 h-4 text-electric-cyan" />
            રજીસ્ટ્રેશન નિયમો અને સેટિંગ્સ
          </div>
          <button
            onClick={() => setRegistrationOpen(!registrationOpen)}
            className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            {registrationOpen ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Open for Registration</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-red-400" />
                <span>Closed</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              એન્ટ્રી / રજીસ્ટ્રેશન ફી (₹)
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
              છેલ્લી તારીખ (Deadline)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              ઓર્ગેનાઈઝર UPI ID (ફી સ્વીકારવા)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. name@okhdfcbank"
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            ફોર્મની શરૂઆતમાં દર્શાવાતી સૂચના (Instructions for Players)
          </label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-obsidian-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-gold-400 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* 3. Google Forms Style Dynamic Custom Fields Builder */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-white font-display flex items-center gap-2">
              📝 ફોર્મ પ્રશ્નો અને ફીલ્ડ્સ (Google Forms Style)
            </h3>
            <p className="text-xs text-slate-400">
              ડિફોલ્ટ ફીલ્ડ્સ (નામ, ફોટો, રોલ, સ્ટાઇલ) ઉપરાંત તમારે જે પણ માહિતી માંગવી હોય તે પ્રશ્નો અહીં ઉમેરો.
            </p>
          </div>
        </div>

        {/* Existing Custom Fields List */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 block">
            તમે ઉમેરેલા કસ્ટમ પ્રશ્નો ({customFields.length})
          </span>

          {customFields.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center rounded-2xl bg-white/[0.02]">
              હજુ સુધી કોઈ કસ્ટમ પ્રશ્ન ઉમેર્યો નથી. નીચેથી નવો પ્રશ્ન ઉમેરો.
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
            નવો પ્રશ્ન ઉમેરો (Add Custom Question)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                પ્રશ્નનું નામ (Question Title)
              </label>
              <input
                type="text"
                placeholder="દા.ત. આધાર કાર્ડ નંબર, સરનામું, અગાઉની ટીમ..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                જવાબનો પ્રકાર (Input Type)
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as FormFieldType)}
                className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="text">Text (ટુંકો જવાબ)</option>
                <option value="number">Number (સંખ્યા)</option>
                <option value="select">Dropdown (વિકલ્પોની યાદી)</option>
                <option value="textarea">Paragraph (લાંબો જવાબ)</option>
                <option value="checkbox">Checkbox (હા/ના સ્વીકાર)</option>
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
                <span>ફરજિયાત?</span>
              </label>
            </div>
          </div>

          {/* Options for dropdown */}
          {newType === 'select' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                વિકલ્પો લખો (અલ્પવિરામ / Comma વડે અલગ કરો)
              </label>
              <input
                type="text"
                placeholder="દા.ત. વિકલ્પ ૧, વિકલ્પ ૨, વિકલ્પ ૩"
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
              પ્રશ્ન ઉમેરો
            </button>
          </div>
        </div>

        {/* Save All Changes Button */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <span className="text-xs text-slate-400">
            બધા ફેરફારો તમારા લાઈવ પ્લેયર રજીસ્ટ્રેશન ફોર્મમાં તરત જ લાગુ થઈ જશે.
          </span>

          <button
            onClick={handleSaveAllSettings}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {savedSuccess ? 'Saved Successfully!' : 'Save Form Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
