import React, { useState } from 'react';
import {
  Tournament,
  Player,
  PlayerRole,
  PlayerCategory,
  CustomFormField,
} from '../types';
import { PlayerCard3D } from './PlayerCard3D';
import { compressForLowBandwidth } from '../utils/imageUtils';
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
  Copy,
  Check,
  ExternalLink,
  Lock,
  QrCode,
  CreditCard,
  Image as ImageIcon,
  FileCheck,
} from 'lucide-react';

interface PublicRegistrationViewProps {
  tournament: Tournament;
  onRegisterPlayer: (player: Player) => Promise<Player>;
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
  const [matches, setMatches] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [strikeRate, setStrikeRate] = useState(0);
  const [basePrice, setBasePrice] = useState(tournament.defaultBasePrice || 20000);
  const [photoUrl, setPhotoUrl] = useState(
    '/player-placeholder.svg'
  );

  // Dynamic Custom Fields values: { fieldId: value }
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Payment State
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [copiedGpay, setCopiedGpay] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Submission State
  const [submitted, setSubmitted] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<Player | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const customFields: CustomFormField[] = tournament.customFields || [];

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressForLowBandwidth(file, (compressedUrl) => {
        setPhotoUrl(compressedUrl);
      });
    }
  };

  const handlePaymentScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressForLowBandwidth(file, (compressedUrl) => {
        setPaymentScreenshotUrl(compressedUrl);
      });
    }
  };

  const gpayNumber = tournament.gpayNumber || '';
  const upiId = tournament.upiId || '';
  const gpayName = tournament.gpayName || tournament.name || 'Tournament Organizer';
  const regFee = tournament.registrationFee ?? 0;
  const isPaymentRequired = regFee > 0 || !!tournament.paymentMandatory;

  // UPI deep link
  const cleanUpi = upiId.trim();
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(gpayName)}&am=${regFee}&cu=INR&tn=${encodeURIComponent(`${tournament.name} Player Entry Fee`)}`;

  // Dynamic QR generator link fallback
  const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(upiDeepLink)}`;
  const activeQrUrl = tournament.gpayQrUrl || generatedQrUrl;

  const handleCopyText = (text: string, type: 'gpay' | 'upi') => {
    navigator.clipboard.writeText(text);
    if (type === 'gpay') {
      setCopiedGpay(true);
      setTimeout(() => setCopiedGpay(false), 2000);
    } else {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      alert('Please enter your full name and valid mobile number.');
      return;
    }

    if (tournament.paymentMandatory && !paymentScreenshotUrl) {
      alert(
        '⚠️ Payment screenshot is mandatory. Please complete payment via Google Pay and upload the screenshot to proceed.'
      );
      return;
    }

    const newPlayer: Player = {
      id: `ply-reg-${Date.now()}`,
      tournamentId: tournament.id,
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
      paymentScreenshotUrl,
      paymentUtr: paymentUtr.trim(),
      paymentStatus: paymentScreenshotUrl ? 'PAID' : 'PENDING',
      paymentAmount: tournament.registrationFee ?? 0,
    };

    setSubmitting(true);
    setSubmitError('');
    try {
      const saved = await onRegisterPlayer(newPlayer);
      setRegisteredPlayer(saved);
      setSubmitted(true);
    } catch (error) {
      setSubmitError((error as Error).message);
    } finally { setSubmitting(false); }
  };

  // Preview Player object for the live 3D card
  const previewPlayer: Player = {
    id: 'preview-id',
    name: fullName.trim() || 'Your Name (Player Name)',
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
              Congratulations, {registeredPlayer.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Your registration has been successfully submitted to the auction pool of <strong>{tournament.name}</strong>.
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

            {/* Payment Verification Receipt Badge */}
            {registeredPlayer.paymentScreenshotUrl ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <img
                    src={registeredPlayer.paymentScreenshotUrl}
                    alt="Payment Receipt"
                    className="w-12 h-12 rounded-xl object-cover border border-emerald-400/40 cursor-pointer shadow"
                    onClick={() => window.open(registeredPlayer.paymentScreenshotUrl, '_blank')}
                    title="Click to view full screenshot"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-black text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Receipt Submitted — Awaiting Verification
                    </span>
                    <p className="text-xs font-black text-white font-mono">
                      ₹{registeredPlayer.paymentAmount ?? 0} payment screenshot attached
                    </p>
                    {registeredPlayer.paymentUtr && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        UTR: {registeredPlayer.paymentUtr}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PENDING
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Payment Status:</span>
                <span className="font-bold text-slate-300">Free / Not Required</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
            >
              Print / Download Digital Pass
            </button>

            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-slate-300 transition-all"
              >
                Back to Main Dashboard
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
              📌 <strong>Important Instructions:</strong> {tournament.instructions}
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
                Player Profile & Registration
              </h2>

              {/* Step 1: Basic Identity */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
                  1. Basic Identity
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priyesh Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      WhatsApp / Mobile Number <span className="text-red-400">*</span>
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
                    Email Address (Optional)
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
                  2. Cricket Playing Style & Stats
                </span>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    Select Primary Cricket Role:
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
                      Batting Style
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
                      Bowling Style
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
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Matches</label>
                    <input
                      type="number"
                      value={matches}
                      onChange={(e) => setMatches(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Total Runs</label>
                    <input
                      type="number"
                      value={runs}
                      onChange={(e) => setRuns(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Wickets</label>
                    <input
                      type="number"
                      value={wickets}
                      onChange={(e) => setWickets(Number(e.target.value))}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Strike Rate (SR)</label>
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
                  3. Passport Size Stage Photo
                </span>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/20 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gold-400/50 shadow-md"
                  />
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-white">Upload a clear, front-facing photo</p>
                    <p className="text-[11px] text-slate-400">
                      This photo will be displayed on 3D player cards and live projector screens during the auction.
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
                    4. Additional Tournament Details
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
                              <option value="">-- Select Option --</option>
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
                              <span>I agree to abide by all official tournament rules and guidelines.</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Google Pay Payment & Verification */}
              {isPaymentRequired && (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-obsidian-900 via-obsidian-900 to-obsidian-950 border-2 border-gold-400/40 shadow-glow-gold/30 space-y-6 relative overflow-hidden">
                  {/* Glowing header banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-emerald-400 to-yellow-400 p-0.5 shadow">
                        <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-gold-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/30">
                            STEP 5 • OFFICIAL PAYMENT
                          </span>
                          {tournament.paymentMandatory && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-white font-display mt-0.5">
                          Google Pay & UPI Payment & Verification
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Registration Fee
                      </span>
                      <span className="text-2xl font-black text-gold-400 font-mono">
                        ₹{regFee}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Transfer <strong>₹{regFee}</strong> to the <strong>Google Pay Scanner</strong> or <strong>Mobile Number</strong> below, then upload your transaction screenshot. Your registration will be confirmed upon review.
                  </p>

                  {/* Payment Details & QR Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    {/* Left: Google Pay QR Scanner Card (md:col-span-5) */}
                    <div className="md:col-span-5 p-4 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col items-center justify-between text-center relative group">
                      <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                        <span className="flex items-center gap-1 text-gold-400">
                          <QrCode className="w-3.5 h-3.5" /> Scan & Pay with Any UPI App
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">ALL UPI APPS</span>
                      </div>

                      {/* QR Box with Scan animation / Border */}
                      <div className="relative p-3 bg-white rounded-2xl shadow-2xl border-2 border-white/40 my-1 group-hover:scale-[1.02] transition-transform">
                        <img
                          src={activeQrUrl}
                          alt="Google Pay QR Code"
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="14" fill="black">GOOGLE PAY QR</text><text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-weight="black" font-size="16" fill="%2310b981">₹${regFee}</text></svg>`;
                          }}
                        />
                        <div className="absolute inset-x-3 top-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 animate-pulse" />
                      </div>

                      {/* Payee Info */}
                      <div className="w-full mt-3 pt-2 border-t border-white/10">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Payee Name
                        </span>
                        <span className="text-xs font-black text-white truncate block">
                          {gpayName}
                        </span>
                      </div>

                      {/* Deep Link Button for Mobile Users */}
                      <a
                        href={upiDeepLink}
                        className="w-full mt-2.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition-all"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Open in Google Pay (Pay Directly)</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    </div>

                    {/* Right: GPay Number, UPI ID and Screenshot Upload (md:col-span-7) */}
                    <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                      {/* 1. Google Pay Number & UPI copy rows */}
                      <div className="space-y-2.5">
                        {/* GPay Mobile Number */}
                        <div className="p-3 rounded-2xl bg-obsidian-950 border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Google Pay Number (Mobile)
                            </span>
                            <span className="text-sm font-black text-gold-400 font-mono tracking-wider">
                              {gpayNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(gpayNumber, 'gpay')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95 transition-all cursor-pointer"
                          >
                            {copiedGpay ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy No.</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* UPI ID */}
                        <div className="p-3 rounded-2xl bg-obsidian-950 border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Google Pay UPI ID (VPA)
                            </span>
                            <span className="text-xs font-bold text-white font-mono truncate max-w-[200px] block">
                              {upiId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(upiId, 'upi')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95 transition-all cursor-pointer"
                          >
                            {copiedUpi ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy UPI</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 2. Mandatory Screenshot Upload Box */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                            Upload Payment Screenshot
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-400">
                            * {tournament.paymentMandatory ? 'Mandatory' : 'Optional'}
                          </span>
                        </label>

                        {paymentScreenshotUrl ? (
                          /* Uploaded Preview */
                          <div className="p-3 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col sm:flex-row items-center gap-3">
                            <img
                              src={paymentScreenshotUrl}
                              alt="Payment Screenshot"
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain bg-black/60 border border-emerald-400/40 shadow"
                            />
                            <div className="flex-1 text-center sm:text-left space-y-1">
                              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Screenshot uploaded successfully!
                              </span>
                              <p className="text-[11px] text-slate-300">
                                The tournament committee will audit this screenshot and UTR to approve your lot in the auction.
                              </p>
                              <label className="inline-block text-xs font-bold text-gold-400 hover:text-gold-300 underline cursor-pointer mt-1">
                                <span>Replace Screenshot</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePaymentScreenshotUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* Dropzone to Upload */
                          <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-gold-400/50 hover:border-gold-400 bg-gold-500/[0.03] hover:bg-gold-500/[0.07] cursor-pointer transition-all text-center group">
                            <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform mb-2">
                              <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-white group-hover:text-gold-300 transition-colors">
                              Click to upload payment screenshot
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              Google Pay Payment Success screen (JPG, PNG)
                            </span>
                            <span className="text-[10px] text-amber-400/90 font-semibold mt-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                              ⚠️ Screenshot required to complete registration
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              required={tournament.paymentMandatory}
                              onChange={handlePaymentScreenshotUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* 3. Transaction UTR / Ref Number */}
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1">
                          Google Pay UPI Reference / UTR Number (Optional 12-digit number)
                        </label>
                        <input
                          type="text"
                          value={paymentUtr}
                          onChange={(e) => setPaymentUtr(e.target.value)}
                          placeholder="e.g. 423871928341 (From Google Pay)"
                          className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-gold-400 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Find the 12-digit 'UPI Transaction ID' or 'UPI Ref No.' in your Google Pay transaction details.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                {submitError && <p role="alert" className="text-sm text-rose-400">{submitError}</p>}
                {tournament.paymentMandatory && !paymentScreenshotUrl && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Payment Screenshot Required:</strong> Please transfer ₹{regFee} to the Google Pay scanner above and upload the screenshot to submit.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || (tournament.paymentMandatory && !paymentScreenshotUrl)}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    tournament.paymentMandatory && !paymentScreenshotUrl
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10 opacity-70'
                      : 'bg-gradient-to-r from-gold-500 via-amber-400 to-yellow-500 hover:from-gold-400 hover:to-amber-300 text-black shadow-glow-gold active:scale-95 cursor-pointer'
                  }`}
                >
                  {tournament.paymentMandatory && !paymentScreenshotUrl ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Upload Screenshot to Submit</span>
                    </>
                  ) : (
                    <>
                      <span>{submitting ? 'Saving registration…' : 'Submit Official Registration'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  You will receive your official digital player pass and confirmation receipt upon submission.
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
                Your auction card updates in real-time as you fill out the form:
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
