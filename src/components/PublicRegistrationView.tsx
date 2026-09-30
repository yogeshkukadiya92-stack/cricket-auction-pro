import React, { useState } from 'react';
import {
  Tournament,
  Player,
  PlayerRole,
  PlayerCategory,
  CustomFormField,
} from '../types';
import { PlayerCard3D } from './PlayerCard3D';
import {
  CheckCircle2,
  Upload,
  Calendar,
  DollarSign,
  AlertCircle,
  Trophy,
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  Award,
  Share2,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';

interface PublicRegistrationViewProps {
  tournament: Tournament;
  onRegisterPlayer: (player: Player) => void;
  onBackToDashboard?: () => void;
}

export const PublicRegistrationView: React.FC<PublicRegistrationViewProps> = ({
  tournament,
  onRegisterPlayer,
  onBackToDashboard,
}) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlayerRole>('ALL_ROUNDER');
  const [battingStyle, setBattingStyle] = useState('Right Hand Batsman');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [matches, setMatches] = useState(15);
  const [runs, setRuns] = useState(320);
  const [wickets, setWickets] = useState(14);
  const [strikeRate, setStrikeRate] = useState(142.5);
  const [basePrice, setBasePrice] = useState(30000);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
  );

  // Dynamic Custom Fields values: { fieldId: value }
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Submission State
  const [submitted, setSubmitted] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<Player | null>(null);

  const customFields: CustomFormField[] = tournament.customFields || [];

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      alert('કૃપા કરીને પૂરું નામ અને મોબાઈલ નંબર દાખલ કરો.');
      return;
    }

    const newPlayer: Player = {
      id: `ply-reg-${Date.now()}`,
      name: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      photoUrl,
      role,
      category: 'SET_A',
      basePrice: Number(basePrice),
      battingStyle,
      bowlingStyle,
      stats: {
        matches: Number(matches),
        runs: Number(runs),
        wickets: Number(wickets),
        strikeRate: Number(strikeRate),
      },
      status: 'AVAILABLE',
      approvalStatus: 'PENDING',
      registeredAt: new Date().toISOString(),
      lotOrder: Math.floor(Math.random() * 900) + 100,
      customData: customValues,
    };

    onRegisterPlayer(newPlayer);
    setRegisteredPlayer(newPlayer);
    setSubmitted(true);
  };

  // Preview Player object for the live 3D card
  const previewPlayer: Player = {
    id: 'preview-id',
    name: fullName.trim() || 'તમારું નામ (Player Name)',
    photoUrl,
    role,
    category: 'SET_A',
    basePrice,
    battingStyle,
    bowlingStyle,
    stats: {
      matches: Number(matches) || 0,
      runs: Number(runs) || 0,
      wickets: Number(wickets) || 0,
      strikeRate: Number(strikeRate) || 0,
    },
    status: 'AVAILABLE',
    lotOrder: 99,
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // If already submitted, show confirmation pass
  if (submitted && registeredPlayer) {
    return (
      <div className="min-h-screen bg-obsidian-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 stadium-beam">
        <div className="max-w-lg w-full rounded-3xl p-8 bg-gradient-to-b from-obsidian-850 via-obsidian-900 to-obsidian-950 border-2 border-emerald-500/80 shadow-glow-emerald text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/50 mx-auto flex items-center justify-center text-4xl animate-bounce">
            🎉
          </div>

          <div>
            <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-400/40">
              REGISTRATION CONFIRMED
            </span>
            <h2 className="text-3xl font-black text-white font-display mt-3">
              અભિનંદન, {registeredPlayer.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              તમારું રજીસ્ટ્રેશન <strong>{tournament.name}</strong> ના ઓક્શન પૂલમાં સફળતાપૂર્વક નોંધાઈ ગયું છે.
            </p>
          </div>

          {/* Digital Pass Badge */}
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <img
                src={registeredPlayer.photoUrl}
                alt={registeredPlayer.name}
                className="w-16 h-16 rounded-xl object-cover border border-white/15"
              />
              <div>
                <h4 className="text-lg font-black text-white font-display">{registeredPlayer.name}</h4>
                <p className="text-xs text-gold-400 font-semibold">{registeredPlayer.role}</p>
                <span className="text-[10px] text-slate-400 font-mono">Reg ID: {registeredPlayer.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Mobile</span>
                <span className="font-bold text-white">{registeredPlayer.mobile}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Base Price</span>
                <span className="font-bold text-gold-400 font-mono">{formatPrice(registeredPlayer.basePrice)}</span>
              </div>
            </div>

            {/* Custom Field Highlights */}
            {customFields.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                {customFields.slice(0, 3).map((f) => {
                  const val = registeredPlayer.customData?.[f.id];
                  if (!val) return null;
                  return (
                    <div key={f.id} className="flex justify-between text-[11px] text-slate-300">
                      <span className="text-slate-400">{f.label}:</span>
                      <span className="font-bold text-white">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
            >
              પ્રિન્ટ અથવા સેવ સ્લિપ (Download Pass)
            </button>

            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-slate-300 transition-all"
              >
                મુખ્ય ડેશબોર્ડ પર પાછા જાઓ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-between selection:bg-gold-500 selection:text-black stadium-beam">
      {/* Top Tournament Header Bar */}
      <header className="p-4 sm:p-6 border-b border-white/10 glass-panel">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 p-0.5 shadow-glow-gold flex items-center justify-center">
              <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center text-lg">
                🏏
              </div>
            </div>
            <div>
              <h1 className="text-base font-black text-white font-display">
                {tournament.name}
              </h1>
              <p className="text-[11px] text-gold-400 font-semibold">
                {tournament.season} • Official Player Registration
              </p>
            </div>
          </div>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Container: Split Form + Live Card Preview */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        {/* Rules & Fee Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-obsidian-850 via-obsidian-900 to-obsidian-850 border border-gold-400/40 shadow-glow-gold mb-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-black text-gold-400 uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              AUCTION PLAYER ENROLLMENT 2026
            </span>

            <div className="flex items-center gap-3">
              {tournament.registrationFee ? (
                <span className="px-3 py-1 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Entry Fee: ₹{tournament.registrationFee}
                </span>
              ) : null}

              {tournament.registrationDeadline && (
                <span className="px-3 py-1 rounded-full font-bold bg-white/10 text-slate-300">
                  Deadline: {tournament.registrationDeadline}
                </span>
              )}
            </div>
          </div>

          {tournament.instructions && (
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              📌 <strong>મહત્વની સૂચના:</strong> {tournament.instructions}
              {tournament.upiId && (
                <span className="block mt-1 font-mono text-gold-400">
                  UPI ID for Entry Fee: <strong>{tournament.upiId}</strong>
                </span>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (7 Columns) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
              <h2 className="text-xl font-black text-white font-display border-b border-white/10 pb-3">
                પ્લેયર પ્રોફાઇલ વિગતો ભરો
              </h2>

              {/* Step 1: Basic Identity */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
                  ૧. પ્રાથમિક માહિતી (Basic Info)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      તમારું પૂરું નામ (Full Name) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. પ્રિયેશ પટેલ"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      WhatsApp / મોબાઈલ નંબર <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98250 12345"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    ઈમેલ એડ્રેસ (Email) - વૈકલ્પિક
                  </label>
                  <input
                    type="email"
                    placeholder="player@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 2: Cricket Credentials */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
                  ૨. ક્રિકેટ રોલ અને સ્ટાઇલ (Playing Style)
                </span>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    તમારો મુખ્ય રોલ પસંદ કરો:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { r: 'BATSMAN' as PlayerRole, l: 'Batsman', i: Zap },
                      { r: 'BOWLER' as PlayerRole, l: 'Bowler', i: Shield },
                      { r: 'ALL_ROUNDER' as PlayerRole, l: 'All-Rounder', i: Sparkles },
                      { r: 'WICKET_KEEPER' as PlayerRole, l: 'Wicket Keeper', i: Award },
                    ].map((item) => {
                      const Icon = item.i;
                      const isSel = role === item.r;
                      return (
                        <button
                          key={item.r}
                          type="button"
                          onClick={() => setRole(item.r)}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                            isSel
                              ? 'border-gold-400 bg-gold-500/20 text-gold-300 shadow-glow-gold font-black'
                              : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{item.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      બેટિંગ સ્ટાઇલ (Batting Style)
                    </label>
                    <select
                      value={battingStyle}
                      onChange={(e) => setBattingStyle(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
                    >
                      <option value="Right Hand Opening Batsman">Right Hand Opening</option>
                      <option value="Right Hand Middle Order">Right Hand Middle Order</option>
                      <option value="Right Hand Explosive Finisher">Right Hand Finisher</option>
                      <option value="Left Hand Opening Batsman">Left Hand Opening</option>
                      <option value="Left Hand Middle Order">Left Hand Middle Order</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      બોલિંગ સ્ટાઇલ (Bowling Style)
                    </label>
                    <select
                      value={bowlingStyle}
                      onChange={(e) => setBowlingStyle(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
                    >
                      <option value="Right Arm Fast (Pace)">Right Arm Fast</option>
                      <option value="Right Arm Medium Swing">Right Arm Medium</option>
                      <option value="Right Arm Leg Spin">Right Arm Leg Spin</option>
                      <option value="Right Arm Off Break">Right Arm Off Break</option>
                      <option value="Left Arm Fast (Pace)">Left Arm Fast</option>
                      <option value="Left Arm Orthodox Spin">Left Arm Spin</option>
                      <option value="N/A">N/A (Pure Batsman/Keeper)</option>
                    </select>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">મેચ (Matches)</label>
                    <input
                      type="number"
                      value={matches}
                      onChange={(e) => setMatches(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">કુલ રન (Runs)</label>
                    <input
                      type="number"
                      value={runs}
                      onChange={(e) => setRuns(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">વિકેટ્સ (Wkts)</label>
                    <input
                      type="number"
                      value={wickets}
                      onChange={(e) => setWickets(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">સ્ટ્રાઈક રેટ (SR)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={strikeRate}
                      onChange={(e) => setStrikeRate(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Photo Upload */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
                  ૩. પાસપોર્ટ સાઇઝ ફોટો (Live Stage Photo)
                </span>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/20 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gold-400/50 shadow-md"
                  />
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-white">સ્પષ્ટ ચહેરાવાળો ફોટો અપલોડ કરો</p>
                    <p className="text-[11px] text-slate-400">
                      ઓક્શન સ્ટેજ પર જ્યારે ટીમો તમારા પર બોલી લગાવશે ત્યારે આ ફોટો 3D કાર્ડમાં દેખાશે.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gold-500 file:text-black hover:file:bg-gold-400 cursor-pointer pt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Dynamically Generated Custom Questions! */}
              {customFields.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
                    ૪. વધારાની વિગતો (Additional Tournament Details)
                  </span>

                  <div className="space-y-3">
                    {customFields.map((field) => {
                      if (!field.enabled) return null;
                      const val = customValues[field.id] || '';

                      return (
                        <div key={field.id}>
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </label>

                          {field.helpText && (
                            <span className="text-[11px] text-slate-400 block mb-1">
                              {field.helpText}
                            </span>
                          )}

                          {field.type === 'text' && (
                            <input
                              type="text"
                              required={field.required}
                              placeholder={field.placeholder || ''}
                              value={val}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
                            />
                          )}

                          {field.type === 'number' && (
                            <input
                              type="number"
                              required={field.required}
                              placeholder={field.placeholder || ''}
                              value={val}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-gold-400 focus:outline-none font-mono"
                            />
                          )}

                          {field.type === 'select' && (
                            <select
                              required={field.required}
                              value={val}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
                            >
                              <option value="">-- પસંદ કરો --</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}

                          {field.type === 'textarea' && (
                            <textarea
                              rows={2}
                              required={field.required}
                              placeholder={field.placeholder || ''}
                              value={val}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-gold-400 focus:outline-none resize-none"
                            />
                          )}

                          {field.type === 'checkbox' && (
                            <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                required={field.required}
                                checked={!!val}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                                className="rounded text-gold-500"
                              />
                              <span>હું ટુર્નામેન્ટના તમામ નિયમોનું પાલન કરવાની બાંયધરી આપું છું.</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-white/10">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-gold-500 via-amber-400 to-yellow-500 hover:from-gold-400 hover:to-amber-300 text-black shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>સબમિટ કરો (Submit Official Registration)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  સબમિટ કર્યા પછી તમને તમારો ડિજિટલ પ્લેયર રજીસ્ટ્રેશન પાસ મળશે.
                </p>
              </div>
            </form>
          </div>

          {/* Right Live 3D Auction Card Preview (5 Columns) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="p-4 rounded-2xl glass-panel border border-white/10 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-gold-400 flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-gold-400" />
                LIVE 3D AUCTION CARD PREVIEW
              </span>
              <p className="text-[11px] text-slate-400">
                જેમ જેમ તમે ફોર્મ ભરશો તેમ તેમ તમારું ઓક્શન કાર્ડ રીયલ-ટાઇમમાં અપડેટ થશે:
              </p>
            </div>

            <div className="flex justify-center">
              <PlayerCard3D player={previewPlayer} isBigStage={false} />
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        {tournament.name} • Player Registration Powered by Cricket Auction Pro 2026
      </footer>
    </div>
  );
};
