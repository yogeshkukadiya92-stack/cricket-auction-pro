import React, { useState, useEffect } from 'react';
import { initialRules } from '../mockData';
import { Tournament } from '../types';
import { processUploadedImage } from '../utils/imageUtils';
import { isImageLogo, TeamLogo } from './TeamLogo';
import {
  X,
  Trophy,
  Upload,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Award,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface TournamentModalProps {
  isOpen: boolean;
  initialData?: Tournament | null;
  onSave: (data: Partial<Tournament>) => void;
  onClose: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  initialData,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState(2026);
  const [status, setStatus] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED'>('UPCOMING');
  const [logoUrl, setLogoUrl] = useState('🏆');
  const [sportType, setSportType] = useState<'CRICKET' | 'FOOTBALL' | 'KABADDI' | 'VOLLEYBALL' | 'OTHER'>('CRICKET');

  // Sponsors
  const [sponsor, setSponsor] = useState('');
  const [coSponsors, setCoSponsors] = useState('');

  // Auction & Financials
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(initialRules.maxPlayersPerTeam);
  const [minPlayersPerTeam, setMinPlayersPerTeam] = useState(initialRules.minPlayersPerTeam);
  const [minimumPlayerReserve, setMinimumPlayerReserve] = useState(20000);
  const [bidIncrement, setBidIncrement] = useState(20000);
  const [defaultBasePrice, setDefaultBasePrice] = useState(20000);
  const [totalPursePerTeam, setTotalPursePerTeam] = useState(1000000);
  const [expectedTeamsCount, setExpectedTeamsCount] = useState(8);

  // Ground & Schedule
  const [ground, setGround] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ballType, setBallType] = useState('Heavy Tennis Ball');

  // Registration & UPI
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [paymentMandatory, setPaymentMandatory] = useState(false);
  const [registrationFee, setRegistrationFee] = useState(0);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [upiId, setUpiId] = useState('');
  const [gpayNumber, setGpayNumber] = useState('');
  const [gpayName, setGpayName] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setMaxPlayersPerTeam(initialData.rules?.maxPlayersPerTeam || initialRules.maxPlayersPerTeam);
      setMinPlayersPerTeam(initialData.rules?.minPlayersPerTeam || initialRules.minPlayersPerTeam);
      setName(initialData.name || '');
      setSeason(initialData.season || 'Season 1');
      setYear(initialData.year || 2026);
      setStatus(initialData.status || 'UPCOMING');
      setLogoUrl(initialData.logoUrl || '🏆');
      setSponsor(initialData.sponsor || '');
      setCoSponsors(initialData.coSponsors || '');
      setDefaultBasePrice(initialData.defaultBasePrice || 20000);
      setBidIncrement(initialData.rules?.bidIncrement || initialData.defaultBasePrice || 20000);
      setMinimumPlayerReserve(initialData.rules?.minimumPlayerReserve || initialData.defaultBasePrice || 20000);
      setTotalPursePerTeam(initialData.totalPursePerTeam || 1000000);
      setExpectedTeamsCount(initialData.expectedTeamsCount || 8);
      setGround(initialData.ground || '');
      setCity(initialData.city || '');
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
      setBallType(initialData.ballType || 'Heavy Tennis Ball');
      setRegistrationOpen(initialData.registrationOpen ?? true);
      setRegistrationFee(initialData.registrationFee ?? 0);
      setPaymentMandatory(initialData.paymentMandatory ?? false);
      setRegistrationDeadline(initialData.registrationDeadline || '');
      setUpiId(initialData.upiId || '');
      setGpayNumber(initialData.gpayNumber || '');
      setGpayName(initialData.gpayName || '');
      setSportType(initialData.sportType || 'CRICKET');
    } else {
      setPaymentMandatory(false);
      // Default clean values for new tournament
      setName('');
      setSeason('Season 1');
      setYear(2026);
      setStatus('UPCOMING');
      setLogoUrl('🏆');
      setSponsor('');
      setCoSponsors('');
      setDefaultBasePrice(20000);
      setTotalPursePerTeam(1000000);
      setExpectedTeamsCount(8);
      setGround('');
      setCity('');
      setStartDate('');
      setEndDate('');
      setBallType('Heavy Tennis Ball');
      setRegistrationOpen(true);
      setRegistrationFee(500);
      setRegistrationDeadline('');
      setUpiId('');
      setGpayNumber('');
      setGpayName('');
      setSportType('CRICKET');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Please choose an image under 5MB');
        return;
      }
      processUploadedImage(file, 360, (dataUrl) => {
        setLogoUrl(dataUrl);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a Tournament Name');
      return;
    }

    if (!Number.isFinite(bidIncrement) || bidIncrement <= 0) {
      setError("Enter a positive bid increment");
      return;
    }
    if (!Number.isSafeInteger(minimumPlayerReserve) || minimumPlayerReserve <= 0) { setError("Enter a positive minimum amount per remaining player"); return; }
    if (!Number.isSafeInteger(maxPlayersPerTeam) || !Number.isSafeInteger(minPlayersPerTeam) || minPlayersPerTeam < 1 || maxPlayersPerTeam < minPlayersPerTeam) { setError("Maximum players must be at least the minimum required squad size."); return; }
    onSave({
      ...(initialData || {}),
      name: name.trim(),
      season: season.trim() || 'Season 1',
      year: Number(year) || 2026,
      status,
      sportType,
      logoUrl: logoUrl.trim() || '🏆',
      sponsor: sponsor.trim(),
      coSponsors: coSponsors.trim(),
      defaultBasePrice: Number(defaultBasePrice) || 20000,
      rules: { ...(initialData?.rules || initialRules), bidIncrement: Number(bidIncrement), minimumPlayerReserve, minPlayersPerTeam, maxPlayersPerTeam, pursePerTeam: Number(totalPursePerTeam) || 1000000 },
      totalPursePerTeam: Number(totalPursePerTeam) || 1000000,
      expectedTeamsCount: Number(expectedTeamsCount) || 8,
      ground: ground.trim(),
      city: city.trim(),
      startDate,
      endDate,
      ballType,
      registrationOpen,
      registrationFee: Number(registrationFee) || 0,
      paymentMandatory,
      registrationDeadline,
      upiId: upiId.trim(),
      gpayNumber: gpayNumber.trim(),
      gpayName: gpayName.trim(),
    });

    onClose();
  };

  const presetEmojis = ['🏆', '🏏', '👑', '⚡', '🛡️', '🦁', '🌟', '🔥', '🎯', '🦅', '🌪️', '⚔️'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative max-w-3xl w-full my-8 rounded-3xl p-6 sm:p-8 bg-obsidian-900 border border-white/10 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 p-0.5 shadow-glow-gold flex items-center justify-center">
              <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center text-xl">
                <Trophy className="w-6 h-6 text-gold-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-display">
                {isEditing ? 'EDIT TOURNAMENT' : 'CREATE NEW TOURNAMENT'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure brand identity, sponsors, venue, base price, and team budgets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Brand & Logo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-gold-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              1. Brand Identity & Sport Type
            </h4>

            {/* Sport Preset Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Select Sport Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'CRICKET', label: '🏏 Cricket' },
                  { id: 'FOOTBALL', label: '⚽ Football' },
                  { id: 'KABADDI', label: '🤼 Kabaddi' },
                  { id: 'VOLLEYBALL', label: '🏐 Volleyball' },
                  { id: 'OTHER', label: '🏸 Other Sports' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSportType(item.id as any)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                      sportType === item.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S2 Premier League / Gujarat Champions Trophy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white font-bold text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Season / Edition *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Season 4 (2026 Edition)"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tournament Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none font-bold"
                >
                  <option value="UPCOMING">🟡 UPCOMING</option>
                  <option value="LIVE">🟢 LIVE AUCTION ACTIVE</option>
                  <option value="COMPLETED">⚪ COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Tournament Logo (PNG Upload / Preview) */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-slate-300 block mb-2">
                Tournament Logo (Upload PNG or pick emoji)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview */}
                <div className="w-20 h-20 rounded-2xl bg-obsidian-950 border-2 border-gold-400/40 p-2 flex items-center justify-center shrink-0 shadow-glow-gold relative group">
                  <TeamLogo logo={logoUrl} name={name || 'Tournament'} className="w-full h-full text-4xl" />
                  {isImageLogo(logoUrl) && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('🏆')}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-500 transition-colors"
                      title="Remove uploaded image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Upload Button & Drop Area */}
                <div className="flex-1 w-full space-y-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gold-400/50 bg-gold-500/[0.04] hover:bg-gold-500/[0.08] cursor-pointer transition-all text-xs font-bold text-gold-400">
                    <Upload className="w-4 h-4" />
                    <span>Upload Transparent PNG Tournament Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  {/* Preset Emojis */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Or choose icon:</span>
                    {presetEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLogoUrl(emoji)}
                        className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${
                          logoUrl === emoji
                            ? 'bg-gold-500/20 border border-gold-400 scale-110'
                            : 'bg-white/5 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sponsorships */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Award className="w-3.5 h-3.5" />
              2. Sponsorship & Title Partners
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Main Title Sponsor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Motors / Reliance Jio"
                  value={sponsor}
                  onChange={(e) => setSponsor(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Co-Sponsors (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dream11, Amul India, CEAT Tyres"
                  value={coSponsors}
                  onChange={(e) => setCoSponsors(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Auction Economy & Team Rules */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              3. Auction Economy & Teams Allocation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tournament-min-players" className="text-xs font-bold text-slate-300 block mb-1">Minimum required players per team *</label>
                <input id="tournament-min-players" type="number" min="1" step="1" required value={minPlayersPerTeam} onChange={(e) => setMinPlayersPerTeam(Number(e.target.value))} className="w-full bg-obsidian-950 border border-white/10 text-white font-bold text-sm px-4 py-2.5 rounded-xl" />
                <p className="text-[10px] text-slate-400 mt-1">Used to reserve the remaining squad budget.</p>
              </div>
              <div>
                <label htmlFor="tournament-max-players" className="text-xs font-bold text-slate-300 block mb-1">Maximum players per team *</label>
                <input id="tournament-max-players" type="number" min={minPlayersPerTeam} step="1" required value={maxPlayersPerTeam} onChange={(e) => setMaxPlayersPerTeam(Number(e.target.value))} className="w-full bg-obsidian-950 border border-white/10 text-white font-bold text-sm px-4 py-2.5 rounded-xl" />
                <p className="text-[10px] text-slate-400 mt-1">Bidding stops with “Squad complete” when this limit is reached.</p>
              </div>
            </div>
            <div>
              <label htmlFor="tournament-player-reserve" className="text-xs font-bold text-slate-300 block mb-1">Minimum amount per remaining player (₹) *</label>
              <input id="tournament-player-reserve" type="number" min="1" step="1" required value={minimumPlayerReserve} onChange={(e) => setMinimumPlayerReserve(Number(e.target.value))} className="w-full bg-obsidian-950 border border-white/10 text-white font-mono font-bold text-sm px-4 py-2.5 rounded-xl" />
              <p className="text-[10px] text-slate-400 mt-1">Reserves money for the remaining minimum squad slots. Set required squad size in Rules → Min Players / Team.</p>
            </div>
            <div>
              <label htmlFor="tournament-bid-increment" className="text-xs font-bold text-slate-300 block mb-1">Bid increase by (₹) *</label>
              <input id="tournament-bid-increment" type="number" min="1" step="1" required value={bidIncrement} onChange={(e) => setBidIncrement(Number(e.target.value))} className="w-full bg-obsidian-950 border border-white/10 text-white font-mono font-bold text-sm px-4 py-2.5 rounded-xl" />
              <p className="text-[10px] text-slate-400 mt-1">Each click adds this amount: e.g. 5000, 10000, 50000 or 100000. Opening bid uses the player's base price.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Default Base Price (₹) *
                </label>
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={defaultBasePrice}
                  onChange={(e) => setDefaultBasePrice(Number(e.target.value))}
                  className="w-full bg-obsidian-950 border border-white/10 text-white font-mono font-bold text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. ₹20,000 for regular pool
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Total Purse Per Team (₹) *
                </label>
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={totalPursePerTeam}
                  onChange={(e) => setTotalPursePerTeam(Number(e.target.value))}
                  className="w-full bg-obsidian-950 border border-white/10 text-white font-mono font-bold text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. ₹10,00,000 budget per franchise
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Expected Teams Count
                </label>
                <input
                  type="number"
                  min="2"
                  max="32"
                  value={expectedTeamsCount}
                  onChange={(e) => setExpectedTeamsCount(Number(e.target.value))}
                  className="w-full bg-obsidian-950 border border-white/10 text-white font-mono font-bold text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Target number of franchises
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Ground, Venue & Dates */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-electric-cyan flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              4. Ground, Venue & Tournament Dates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Ground / Stadium Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Narendra Modi Stadium Ground B / CB Patel Ground"
                  value={ground}
                  onChange={(e) => setGround(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  City / Venue Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad, Surat, Rajkot"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Match Ball Type</label>
                <select
                  value={ballType}
                  onChange={(e) => setBallType(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none font-medium"
                >
                  <option value="Heavy Tennis Ball">🎾 Heavy Tennis Ball (Nivia / Flash)</option>
                  <option value="Light Tennis Ball">🎾 Light Tennis Ball (Vicky)</option>
                  <option value="Leather Ball (White)">🏏 Leather Ball (White 4-Piece)</option>
                  <option value="Leather Ball (Red)">🏏 Leather Ball (Red 4-Piece)</option>
                  <option value="Box Cricket Turf">🏟️ Box Cricket Turf</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Player Registration & UPI / GPay */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                5. Public Registration & Payment Info
              </h4>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                  className="rounded border-white/20 text-gold-500 focus:ring-0 w-4 h-4"
                />
                <span>Enable Public Registration</span>
              </label>
            </div>

            {registrationOpen && (
              <>
              <div>
              <label htmlFor="payment-requirement" className="text-xs font-bold text-slate-300 block mb-1">Payment requirement</label>
              <select id="payment-requirement" value={paymentMandatory ? 'required' : 'optional'} onChange={(e) => setPaymentMandatory(e.target.value === 'required')} className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl">
                <option value="optional">Not compulsory</option>
                <option value="required">Compulsory — payment screenshot required</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-2">{paymentMandatory ? 'Players must upload a payment screenshot before submitting registration.' : 'Players can submit registration without a payment screenshot.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Registration Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(Number(e.target.value))}
                    className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. cricket@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Google Pay Number & Name
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="+91 98250 12345"
                      value={gpayNumber}
                      onChange={(e) => setGpayNumber(e.target.value)}
                      className="bg-obsidian-950 border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Account Name"
                      value={gpayName}
                      onChange={(e) => setGpayName(e.target.value)}
                      className="bg-obsidian-950 border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-500 to-amber-400 text-black hover:from-gold-400 hover:to-amber-300 shadow-glow-gold transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Tournament'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
