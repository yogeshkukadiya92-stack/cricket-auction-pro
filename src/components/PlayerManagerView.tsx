import { ask, copyText, Empty, Menu, notify, PageHead, publicLink } from '../ui/kit';
import { PlayerRecycleBin } from './PlayerRecycleBin';
import { PlayerAuctionHistory } from './PlayerAuctionHistory';
import { PlayerCorrections } from './PlayerCorrections';
import { formatAuctionPrice } from '../utils/currency';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, PlayerRole, PlayerCategory } from '../types';
import {
  downloadSampleCsvTemplate,
  exportPlayersToCsv,
  parseCsvToPlayers,
} from '../utils/csvHelper';
import { compressForLowBandwidth } from '../utils/imageUtils';
import {
  Plus,
  Search,
  Upload,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileSpreadsheet,
  FileUp,
  Link,
  Sliders,
  UserCheck,
  UserX,
  Eye,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Receipt,
  X,
  Copy,
  Users,
  Share2,
} from 'lucide-react';

interface PlayerManagerViewProps {
  teams: import('../types').Team[];
  onCorrect: (action: string, playerId: string, teamId?: string, amount?: number) => Promise<void>;
  customFields?: import('../types').CustomFormField[];
  currency?: import('../types').CurrencyType;
  defaultBasePrice?: number;
  tournamentId: string;
  players: Player[];
  onAddPlayer: (newPlayer: Player) => void;
  onBulkAddPlayers?: (newPlayers: Player[]) => void;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onNavigateToFormBuilder?: () => void;
  onVerifyPayment?: (playerId: string) => void;
  onOpenBulkUpload?: () => void;
}

const roleNames: Record<string, string> = { BATSMAN: 'Batsman', BOWLER: 'Bowler', ALL_ROUNDER: 'All-rounder', WICKET_KEEPER: 'Keeper' };

export const PlayerManagerView: React.FC<PlayerManagerViewProps> = ({
  teams,
  onOpenBulkUpload,
  onCorrect,
  customFields = [],
  currency = 'INR',
  defaultBasePrice = 20000,
  tournamentId,
  players,
  onAddPlayer,
  onBulkAddPlayers,
  onDeletePlayer,
  onNavigateToFormBuilder,
  onVerifyPayment,
}) => {
  const [deletingPlayer, setDeletingPlayer] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const removePlayer = async (id: string) => {
    setDeletingPlayer(id); setDeleteError('');
    try { await onDeletePlayer(id); }
    catch (err) { setDeleteError((err as Error).message); }
    finally { setDeletingPlayer(''); }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReceiptPlayer, setSelectedReceiptPlayer] = useState<Player | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const runExport = async (images = false) => {
    setExportBusy(true);
    setExportError('');
    try {
      const { exportRegistrationsExcel, downloadRegistrationImages } = await import('../utils/registrationExport');
      if (images) await downloadRegistrationImages(players);
      else await exportRegistrationsExcel(players, customFields);
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExportBusy(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [profileDetails, setProfileDetails] = useState<{city?: string; email?: string}>({});
  const [profileMessage, setProfileMessage] = useState('');
  const [role, setRole] = useState<PlayerRole>('ALL_ROUNDER');
  const [category, setCategory] = useState<PlayerCategory>('SET_A');
  const [basePrice, setBasePrice] = useState<number>(defaultBasePrice);
  const [battingStyle, setBattingStyle] = useState('Right Hand Batsman');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [matches, setMatches] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [strikeRate, setStrikeRate] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(
    '/player-placeholder.svg'
  );

  useEffect(() => {
    setProfileMessage('');
    if (!isAddModalOpen) return;
    let normalized = mobile.replace(/\D/g, '');
    if (normalized.length === 12 && normalized.startsWith('91')) normalized = normalized.slice(2);
    if (normalized.length === 11 && normalized.startsWith('0')) normalized = normalized.slice(1);
    if (!/^[6-9]\d{9}$/.test(normalized)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/player-profile`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({mobile:normalized}), signal:controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Profile lookup failed');
        if (controller.signal.aborted) return;
        const p = result.profile;
        if (!p) { setProfileMessage('New mobile number — fill player details.'); return; }
        setProfileDetails({city:p.city,email:p.email});
        setName(p.name || ''); setPhotoUrl(p.photoUrl || '/player-placeholder.svg'); setRole(p.role || 'ALL_ROUNDER');
        setBattingStyle(p.battingStyle || ''); setBowlingStyle(p.bowlingStyle || '');
        setMatches(p.stats?.matches || 0); setRuns(p.stats?.runs || 0); setWickets(p.stats?.wickets || 0); setStrikeRate(p.stats?.strikeRate || 0);
        setProfileMessage('Previous profile filled. Review and update details before adding.');
      } catch(e) { if(!controller.signal.aborted) setProfileMessage((e as Error).message); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mobile, tournamentId, isAddModalOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressForLowBandwidth(file, (compressedUrl) => {
        setPhotoUrl(compressedUrl);
      });
    }
  };

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlayer: Player = {
      id: `ply-${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      registeredAt: new Date().toISOString(),
      ...profileDetails,
      photoUrl,
      role,
      category,
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
      lotOrder: players.length + 1,
    };

    onAddPlayer(newPlayer);
    setIsAddModalOpen(false);
    // Reset fields
    setName('');
    setMobile('');
    setProfileDetails({});
  };

  const filteredPlayers = useMemo(() => players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => (a.lotOrder || 0) - (b.lotOrder || 0)), [players, searchTerm, roleFilter, statusFilter]);
  const [visibleCount, setVisibleCount] = useState(48);
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  useEffect(() => setVisibleCount(48), [searchTerm, roleFilter, statusFilter, tournamentId]);

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, currency);
  };

  return (
    <div className="space-y-5">
      <PageHead
        title="Players"
        count={players.length}
        actions={<>
          <Menu label="Share" icon={Share2} items={[
            { label: 'Copy sign-up link', icon: Link, onClick: () => { void copyText(publicLink('register', tournamentId), 'Sign-up link copied'); } },
            { label: 'Copy player list link', icon: Copy, onClick: () => { void copyText(publicLink('registrations', tournamentId), 'Player list link copied'); } },
            { label: 'Open player list', icon: ExternalLink, href: publicLink('registrations', tournamentId) },
            ...(onNavigateToFormBuilder ? [{ label: 'Edit sign-up form', icon: Sliders, onClick: onNavigateToFormBuilder }] : []),
          ]} />
          <Menu label={exportBusy ? 'Preparing…' : 'Excel'} icon={FileSpreadsheet} items={[
            ...(onOpenBulkUpload ? [{ label: 'Import players', icon: FileUp, onClick: onOpenBulkUpload }] : []),
            { label: 'Download Excel', icon: Download, disabled: exportBusy, onClick: () => { void runExport(); } },
            { label: 'Download photos (ZIP)', icon: Download, disabled: exportBusy, onClick: () => { void runExport(true); } },
          ]} />
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary"><Plus className="w-4 h-4" />Add player</button>
        </>}
      />
      {deleteError && <p role="alert" className="text-sm text-red-300">{deleteError}</p>}
      {exportError && <p role="status" className="text-sm text-amber-300">{exportError}</p>}

      {/* Search and one-tap filters */}
      <div className="space-y-2.5">
        <label className="relative block max-w-md"><span className="sr-only">Search players</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="search" placeholder="Search by name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="field pl-9" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto cap-scroll-hide pb-1">
          {([['ALL', 'All', players.length], ['AVAILABLE', 'Waiting', players.filter(p => p.status === 'AVAILABLE').length], ['SOLD', 'Sold', players.filter(p => p.status === 'SOLD').length], ['UNSOLD', 'Unsold', players.filter(p => p.status === 'UNSOLD').length]] as const).map(([value, label, count]) => <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`btn min-h-9 px-3 shrink-0 ${statusFilter === value ? 'bg-white text-black' : 'btn-ghost'}`}>{label} <span className="opacity-60">{count}</span></button>)}
          <span aria-hidden className="w-px shrink-0 bg-white/10 mx-1" />
          {([['ALL', 'All roles'], ['BATSMAN', 'Batsman'], ['BOWLER', 'Bowler'], ['ALL_ROUNDER', 'All-rounder'], ['WICKET_KEEPER', 'Keeper']] as const).map(([value, label]) => <button key={value} onClick={() => setRoleFilter(value)} aria-pressed={roleFilter === value} className={`btn min-h-9 px-3 shrink-0 ${roleFilter === value ? 'bg-white text-black' : 'btn-ghost'}`}>{label}</button>)}
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <Empty icon={Users} title={players.length ? 'No match' : 'No players yet'} actions={!players.length && <>
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary"><Plus className="w-4 h-4" />Add player</button>
          {onOpenBulkUpload && <button onClick={onOpenBulkUpload} className="btn btn-ghost"><FileUp className="w-4 h-4" />Import Excel</button>}
          <button onClick={() => { void copyText(publicLink('register', tournamentId), 'Sign-up link copied'); }} className="btn btn-ghost"><Link className="w-4 h-4" />Copy sign-up link</button>
        </>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filteredPlayers.slice(0, visibleCount).map((player) => {
            const soldTeam = teams.find((team) => team.id === player.soldToTeamId);
            return <article key={player.id} className="tile flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden bg-obsidian-950">
                <img decoding="async" loading="lazy" src={player.photoUrl || '/player-placeholder.svg'} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-obsidian-950/85 px-1.5 py-0.5 text-[11px] font-extrabold text-white">{player.category === 'MARQUEE' ? '★ ' : ''}#{player.lotOrder}</span>
                {player.status !== 'AVAILABLE' && <span className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold uppercase ${player.status === 'SOLD' ? 'bg-emerald-500 text-black' : player.status === 'UNSOLD' ? 'bg-red-500 text-white' : 'bg-gold-500 text-black'}`}>{player.status === 'SOLD' ? 'Sold' : player.status === 'UNSOLD' ? 'Unsold' : 'On block'}</span>}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h2 className="font-display text-2xl font-extrabold uppercase leading-none text-white truncate">{player.name}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400 truncate">{roleNames[player.role] || player.role}{player.status === 'SOLD' && soldTeam ? ` · ${soldTeam.shortCode || soldTeam.name}` : ''}</p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="score text-xl text-white truncate">{formatPrice(player.status === 'SOLD' ? player.soldPrice || 0 : player.basePrice)}</span>
                  <span className="flex shrink-0">
                    {player.paymentScreenshotUrl && <button type="button" onClick={() => setSelectedReceiptPlayer(player)} aria-label={`Payment receipt of ${player.name}`} title="Payment receipt" className={`btn-icon w-8 h-8 ${player.paymentStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-300'}`}><Eye className="w-4 h-4" /></button>}
                    <button type="button" onClick={() => setDetailPlayerId(detailPlayerId === player.id ? null : player.id)} aria-expanded={detailPlayerId === player.id} aria-label={`Details of ${player.name}`} title="Details" className="btn-icon w-8 h-8"><Sliders className="w-4 h-4" /></button>
                    <button disabled={!!deletingPlayer} onClick={() => void removePlayer(player.id)} aria-label={`Move ${player.name} to recycle bin`} title="Move to recycle bin" className="btn-icon w-8 h-8 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </span>
                </div>
                {player.paymentStatus && player.paymentStatus !== 'EXEMPT' && player.paymentStatus !== 'VERIFIED' && !player.paymentScreenshotUrl && <p className="mt-1 text-[11px] font-bold text-amber-300">Fee pending</p>}
                {detailPlayerId === player.id && <div className="cap-rise mt-2 pt-2 border-t border-white/10 space-y-1 text-xs break-words">
                  {[['Mobile', player.mobile], ['Email', player.email], ['City', player.city], ['Batting', player.battingStyle], ['Bowling', player.bowlingStyle], ['Matches', player.stats.matches], ['Runs', player.stats.runs], ['Wickets', player.stats.wickets], ['Strike rate', player.stats.strikeRate], ['Base price', formatPrice(player.basePrice)], ['UTR', player.paymentUtr]].filter(([, value]) => value !== undefined && value !== '').map(([label, value]) => <p key={String(label)} className="flex justify-between gap-2"><span className="text-slate-400">{label}</span><span className="font-semibold text-white text-right">{String(value)}</span></p>)}
                  {Object.entries(player.customData || {}).map(([key, value]) => <p key={key} className="flex justify-between gap-2"><span className="text-slate-400">{customFields.find(f => f.id === key)?.label || key}</span>{typeof value === 'string' && (value.startsWith('data:image/') || /^\/api\/tournaments\/.+\/media\/custom\//.test(value)) ? <a href={value} download={`${player.id}_${key}.png`} className="font-bold text-gold-400">Download</a> : <span className="font-semibold text-white text-right">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</span>}</p>)}
                  {player.photoUrl && !player.photoUrl.includes('player-placeholder') && <a href={player.photoUrl} download={`${player.id}_player-photo`} className="block pt-1 font-bold text-gold-400">Download photo</a>}
                  <PlayerAuctionHistory tournamentId={tournamentId} playerId={player.id} />
                </div>}
              </div>
            </article>;
          })}
        </div>
      )}
      {filteredPlayers.length > visibleCount && <button onClick={() => setVisibleCount(n => n + 48)} className="btn btn-ghost w-full">Show more ({filteredPlayers.length - visibleCount})</button>}

      <div className="grid gap-3 lg:grid-cols-2 items-start">
        <PlayerCorrections tournamentId={tournamentId} players={players} teams={teams} onCorrect={onCorrect} />
        <PlayerRecycleBin key={tournamentId} tournamentId={tournamentId} playerCount={players.length} onRestore={id => onCorrect('RESTORE', id)} />
      </div>

      {/* Add New Player Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-xl w-full rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl my-8">
            <h3 className="font-display text-4xl font-extrabold uppercase text-white mb-4">Add player</h3>

            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="mb-4">
                <label className="text-xs font-bold text-slate-300 block mb-1">Mobile number — autofill existing player</label>
                <input aria-label="Player mobile number" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile number" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" />
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  <input aria-label="Player city" value={profileDetails.city || ''} onChange={e=>setProfileDetails(p=>({...p,city:e.target.value}))} placeholder="City" className="p-2 rounded-xl bg-slate-900 text-white" />
                  <input aria-label="Player email" type="email" value={profileDetails.email || ''} onChange={e=>setProfileDetails(p=>({...p,email:e.target.value}))} placeholder="Email" className="p-2 rounded-xl bg-slate-900 text-white" />
                </div>
                {profileMessage && <p role="status" className="text-xs text-amber-300 mt-2">{profileMessage}</p>}
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priyesh Patel"
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Playing Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as PlayerRole)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    <option value="BATSMAN">Batsman</option>
                    <option value="BOWLER">Bowler</option>
                    <option value="ALL_ROUNDER">All-Rounder</option>
                    <option value="WICKET_KEEPER">Wicket Keeper</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Category Pool</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PlayerCategory)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    <option value="MARQUEE">★ Marquee Icon</option>
                    <option value="SET_A">Set A (Premium)</option>
                    <option value="SET_B">Set B (Regular)</option>
                    <option value="ACCELERATED">Accelerated</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Upload or URL */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Player Photo</label>
                <div className="flex items-center gap-3">
                  <img decoding="async" loading="lazy"
                    src={photoUrl || "/player-placeholder.svg"}
                    alt="Preview"
                    className="w-14 h-14 rounded-xl object-cover border border-white/10"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Inputs */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
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
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Runs</label>
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
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Strike Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={strikeRate}
                    onChange={(e) => setStrikeRate(Number(e.target.value))}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95"
                >
                  Save & Add to Auction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Verification Modal */}
      {selectedReceiptPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-2xl w-full rounded-3xl p-6 bg-obsidian-900 border-2 border-emerald-500/40 shadow-glow-emerald/30 my-8 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-display">
                    Google Pay Payment Verification (Payment Audit)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review player uploaded Google Pay payment screenshot and UTR number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptPlayer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Left: Uploaded Screenshot View */}
              <div className="p-3 rounded-2xl bg-obsidian-950 border border-white/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">
                  Uploaded Payment Screenshot
                </span>
                {selectedReceiptPlayer.paymentScreenshotUrl ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <img decoding="async" loading="lazy"
                      src={selectedReceiptPlayer.paymentScreenshotUrl}
                      alt="Payment Screenshot"
                      className="max-h-72 w-full object-contain rounded-xl bg-black/60 border border-white/10 shadow-lg cursor-zoom-in"
                      onClick={() => window.open(selectedReceiptPlayer.paymentScreenshotUrl, '_blank')}
                      title="Click to view full size"
                    />
                    <a
                      href={selectedReceiptPlayer.paymentScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open full-size image in new tab
                    </a>
                  </div>
                ) : (
                  <div className="py-12 text-slate-500 text-xs">
                    No screenshot uploaded.
                  </div>
                )}
              </div>

              {/* Right: Player & Transaction Details */}
              <div className="flex flex-col justify-between space-y-4">
                {/* Player Profile Quick Info */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <img decoding="async" loading="lazy"
                    src={selectedReceiptPlayer.photoUrl || "/player-placeholder.svg"}
                    alt={selectedReceiptPlayer.name}
                    className="w-14 h-14 rounded-xl object-cover border border-white/20"
                  />
                  <div>
                    <h4 className="text-base font-black text-white font-display">
                      {selectedReceiptPlayer.name}
                    </h4>
                    <span className="text-xs text-gold-400 font-bold block">
                      {selectedReceiptPlayer.role}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Mobile: {selectedReceiptPlayer.mobile || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Payment Breakdown Box */}
                <div className="p-3.5 rounded-2xl bg-obsidian-950 border border-white/10 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-slate-400">Amount Paid:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      ₹{selectedReceiptPlayer.paymentAmount ?? 0}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Google Pay UPI Ref / UTR No:
                    </span>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-white font-bold flex items-center justify-between select-all">
                      <span>{selectedReceiptPlayer.paymentUtr || 'Check inside screenshot (Not typed)'}</span>
                      {selectedReceiptPlayer.paymentUtr && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedReceiptPlayer.paymentUtr || '');
                            notify('UTR copied', 'ok');
                          }}
                          className="text-[10px] text-gold-400 hover:underline cursor-pointer"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Registration Date:</span>
                    <span className="font-mono text-slate-200">
                      {selectedReceiptPlayer.registeredAt
                        ? new Date(selectedReceiptPlayer.registeredAt).toLocaleDateString()
                        : 'Today'}
                    </span>
                  </div>
                </div>

                {/* Verification Guidance */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Verify ₹{selectedReceiptPlayer.paymentAmount ?? 0} and UTR in your Google Pay statement before approving.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedReceiptPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>

              {onVerifyPayment && selectedReceiptPlayer.paymentScreenshotUrl && selectedReceiptPlayer.paymentStatus !== 'VERIFIED' && <button type="button" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold" onClick={() => { onVerifyPayment(selectedReceiptPlayer.id); setSelectedReceiptPlayer(null); }}>Confirm Payment Verified</button>}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
