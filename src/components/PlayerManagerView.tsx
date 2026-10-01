import { PlayerCorrections } from './PlayerCorrections';
import { exportRegistrationsExcel, downloadRegistrationImages } from '../utils/registrationExport';
import { formatAuctionPrice } from '../utils/currency';
import React, { useState, useRef } from 'react';
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
  onDeletePlayer: (playerId: string) => void;
  onNavigateToFormBuilder?: () => void;
  onApprovePlayer?: (playerId: string) => void;
  onVerifyPayment?: (playerId: string) => void;
  onRejectPlayer?: (playerId: string) => void;
}

export const PlayerManagerView: React.FC<PlayerManagerViewProps> = ({
  teams,
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
  onApprovePlayer,
  onVerifyPayment,
  onRejectPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [approvalTab, setApprovalTab] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReceiptPlayer, setSelectedReceiptPlayer] = useState<Player | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const runExport = async (images = false) => { setExportBusy(true); setExportError(''); try { if (images) await downloadRegistrationImages(players); else await exportRegistrationsExcel(players, customFields); } catch (err) { setExportError((err as Error).message); } finally { setExportBusy(false); } };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCsvToPlayers(text, players.length);
        if (parsed.length > 0) {
          if (onBulkAddPlayers) {
            onBulkAddPlayers(parsed);
          } else {
            parsed.forEach((p) => onAddPlayer(p));
          }
          setCsvMessage(`Successfully imported ${parsed.length} players from CSV!`);
          setTimeout(() => setCsvMessage(null), 4000);
        } else {
          alert('Could not parse any valid players from CSV. Please check the template format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Form State
  const [name, setName] = useState('');
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
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesApproval =
      approvalTab === 'ALL' ||
      (approvalTab === 'PENDING'
        ? p.approvalStatus === 'PENDING'
        : p.approvalStatus !== 'PENDING');
    return matchesSearch && matchesRole && matchesStatus && matchesApproval;
  });

  const pendingCount = players.filter((p) => p.approvalStatus === 'PENDING').length;

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, currency);
  };

  return (
    <div className="space-y-6">
      <PlayerCorrections tournamentId={tournamentId} players={players} teams={teams} onCorrect={onCorrect} />
      {/* Top Banner and Quick Stats */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-display flex items-center gap-2">
            👥 PLAYER CATALOG & REGISTRATION
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Unlimited player registration with high-res photo cards and dynamic stats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden File Input for CSV */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={handleCsvFileUpload}
            className="hidden"
          />

          <button
            onClick={() => downloadSampleCsvTemplate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Download CSV Template to fill your player records"
          >
            <Download className="w-3.5 h-3.5 text-gold-400" />
            CSV Template
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95"
            title="Upload CSV with hundreds of players"
          >
            <FileUp className="w-4 h-4 text-electric-cyan" />
            Import CSV
          </button>

          <button
            onClick={() => void runExport()}
            disabled={exportBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Download all registration fields and embedded photos as Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            {exportBusy ? 'Preparing…' : 'Download Excel'}
          </button>

          <button disabled={exportBusy} onClick={() => void runExport(true)} className="px-3 py-2 rounded-xl text-xs bg-white/10 text-white">Download Photos ZIP</button>
          <button onClick={async () => { try { const url = new URL(window.location.pathname, window.location.origin); url.searchParams.set('mode', 'players'); url.searchParams.set('tournamentId', tournamentId); await navigator.clipboard.writeText(url.toString()); setExportError('Live admin link copied — login required.'); } catch { setExportError('Could not copy link.'); } }} className="px-3 py-2 rounded-xl text-xs bg-white/10 text-white">Copy Live Data Link</button>
          {exportError && <p role="status" className="text-xs text-amber-300">{exportError}</p>}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Player
          </button>
        </div>
      </div>

      {/* CSV Success Toast */}
      {csvMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {csvMessage}
        </div>
      )}

      {/* Online Registration Share Hub Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-gold-400/30 shadow-glow-gold flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gold-500/15 border border-gold-400/30 text-gold-400 shadow">
            <Link className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-white font-display">
                Player Online Self-Registration Link
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Share this link in WhatsApp groups so players can self-register with photos, cricket stats, and fees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?mode=register&tournamentId=${encodeURIComponent(tournamentId)}`;
              navigator.clipboard.writeText(url);
              alert('✅ Player registration link copied to clipboard!');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95 transition-all"
          >
            Copy Public Link
          </button>

          {onNavigateToFormBuilder && (
            <button
              onClick={onNavigateToFormBuilder}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              Customize Form (Google Forms)
            </button>
          )}
        </div>
      </div>

      {/* Approval Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setApprovalTab('ALL')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            approvalTab === 'ALL'
              ? 'bg-white/15 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Registered Players ({players.length})
        </button>

        <button
          onClick={() => setApprovalTab('PENDING')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            approvalTab === 'PENDING'
              ? 'bg-amber-500/20 text-gold-400 border border-gold-400/40 font-black shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Pending Review</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-gold-500 text-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-obsidian-900 border border-white/10 px-3.5 py-2 rounded-xl w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search player name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-obsidian-900 border border-white/10 rounded-lg px-2.5 py-1 text-white font-semibold text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="BATSMAN">Batsman</option>
              <option value="BOWLER">Bowler</option>
              <option value="ALL_ROUNDER">All-Rounder</option>
              <option value="WICKET_KEEPER">Wicket Keeper</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-obsidian-900 border border-white/10 rounded-lg px-2.5 py-1 text-white font-semibold text-xs"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Grid or Empty State */}
      {filteredPlayers.length === 0 ? (
        <div className="p-12 lg:p-16 rounded-3xl glass-panel border border-white/10 text-center space-y-4 max-w-xl mx-auto my-6">
          <div className="w-20 h-20 rounded-3xl bg-gold-500/10 border border-gold-400/20 mx-auto flex items-center justify-center text-3xl shadow-glow-gold">
            🏏
          </div>
          <h3 className="text-2xl font-black text-white font-display">
            No Players Found
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No players have been added to your live auction yet. Share the registration link with players, import via CSV, or add players manually.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onNavigateToFormBuilder && (
              <button
                onClick={onNavigateToFormBuilder}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Link className="w-3.5 h-3.5" />
                View Registration Link & QR
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Player
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4 flex flex-col justify-between hover:border-gold-400/40 transition-all group"
          >
            <div>
              <div className="relative w-full h-44 rounded-xl overflow-hidden mb-3 bg-obsidian-950">
                <img
                  src={player.photoUrl || "/player-placeholder.svg"}
                  alt={player.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-obsidian-950/80 backdrop-blur-md text-white border border-white/10">
                  LOT #{player.lotOrder}
                </span>
                {player.category === 'MARQUEE' && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gold-500 text-black shadow">
                    ★ MARQUEE
                  </span>
                )}
                {/* Status Badge */}
                <div className="absolute bottom-2 left-2">
                  {player.status === 'SOLD' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> SOLD
                    </span>
                  )}
                  {player.status === 'UNSOLD' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> UNSOLD
                    </span>
                  )}
                  {player.status === 'AVAILABLE' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/80 text-white flex items-center gap-1">
                      <Clock className="w-3 h-3" /> UPCOMING
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-lg font-black text-white truncate font-display">{player.name}</h4>
              <p className="text-xs text-gold-400 font-semibold mb-2">{player.role}</p>

              <div className="grid grid-cols-3 gap-1 text-center py-2 border-t border-white/5 text-[11px]">
                <div className="bg-white/[0.02] p-1 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">RUNS</span>
                  <span className="font-bold text-white">{player.stats.runs}</span>
                </div>
                <div className="bg-white/[0.02] p-1 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">WKTS</span>
                  <span className="font-bold text-electric-cyan">{player.stats.wickets}</span>
                </div>
                <div className="bg-white/[0.02] p-1 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">S.R.</span>
                  <span className="font-bold text-emerald-400">{player.stats.strikeRate}</span>
                </div>
              </div>
              <details className="mt-3 border-t border-white/10 pt-2 text-xs">
                <summary className="cursor-pointer text-amber-300">Full registration details & photos</summary>
                <div className="space-y-2 mt-3 break-words">
                  {Object.entries(player).filter(([k]) => !['photoUrl', 'paymentScreenshotUrl', 'customData', 'stats'].includes(k)).map(([k, v]) => <p key={k}><span className="text-slate-400">{k}: </span>{String(v ?? '')}</p>)}
                  {Object.entries(player.customData || {}).map(([k, v]) => <div key={k}><span className="text-slate-400">{customFields.find(f => f.id === k)?.label || k}: </span>{typeof v === 'string' && v.startsWith('data:image/') ? <a href={v} download={`${player.id}_${k}.png`} className="text-amber-300">Download uploaded image</a> : <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>}</div>)}
                  {player.photoUrl && <a href={player.photoUrl} download={`${player.id}_player-photo`} className="block text-amber-300">Download player photo</a>}
                  {player.paymentScreenshotUrl && <a href={player.paymentScreenshotUrl} download={`${player.id}_payment-receipt`} className="block text-amber-300">Download payment screenshot<img src={player.paymentScreenshotUrl} alt="Payment screenshot" loading="lazy" className="mt-2 max-h-64 rounded-lg" /></a>}
                </div>
              </details>
              {/* Custom Form Data Preview */}
              {player.customData && Object.keys(player.customData).length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                  {player.customData.jersey_size && (
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Jersey:</span>
                      <span className="font-bold text-white font-mono">{player.customData.jersey_size}</span>
                    </div>
                  )}
                  {player.customData.player_city && (
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>City:</span>
                      <span className="font-bold text-white">{player.customData.player_city}</span>
                    </div>
                  )}
                  {player.mobile && (
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Mobile:</span>
                      <span className="font-mono text-slate-300">{player.mobile}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {player.status === 'SOLD' ? 'Sold Price' : 'Base Price'}
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {player.status === 'SOLD' ? formatPrice(player.soldPrice || 0) : formatPrice(player.basePrice)}
                  </span>
                </div>
                <button
                  onClick={() => onDeletePlayer(player.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Player"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Payment Verification Badge & View Receipt */}
              {(player.paymentScreenshotUrl || player.paymentUtr || player.paymentStatus) && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        player.paymentStatus === 'PAID' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-bold text-slate-300">
                      {player.paymentStatus === 'VERIFIED' ? 'Payment Verified' : player.paymentScreenshotUrl ? 'Receipt Submitted' : 'Fee Pending'}
                    </span>
                    {player.paymentUtr && (
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                        (UTR: {player.paymentUtr.slice(0, 6)}..)
                      </span>
                    )}
                  </div>
                  {player.paymentScreenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptPlayer(player)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer"
                      title="Verify payment screenshot and UTR"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Receipt</span>
                    </button>
                  )}
                </div>
              )}

              {/* Pending Approval Actions */}
              {player.approvalStatus === 'PENDING' && (
                <div className="flex items-center gap-1.5 pt-1">
                  {onApprovePlayer && (
                    <button
                      onClick={() => onApprovePlayer(player.id)}
                      className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1 shadow-glow-emerald active:scale-95 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve Lot
                    </button>
                  )}
                  {onRejectPlayer && (
                    <button
                      onClick={() => onRejectPlayer(player.id)}
                      className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center gap-1 transition-all"
                      title="Reject Registration"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add New Player Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-xl w-full rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl my-8">
            <h3 className="text-2xl font-black text-white font-display mb-1">REGISTER CRICKET PLAYER</h3>
            <p className="text-xs text-slate-400 mb-6">Fill in player profile, role, base price and upload photo.</p>

            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <img
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
                    <img
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
                  <img
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
                            alert('UTR copied to clipboard!');
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
              {selectedReceiptPlayer.approvalStatus === 'PENDING' && (
                <>
                  {onRejectPlayer && (
                    <button
                      type="button"
                      onClick={() => {
                        onRejectPlayer(selectedReceiptPlayer.id);
                        setSelectedReceiptPlayer(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                  {onApprovePlayer && (
                    <button
                      type="button"
                      onClick={() => {
                        onApprovePlayer(selectedReceiptPlayer.id);
                        setSelectedReceiptPlayer(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-glow-emerald active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve & Verify Player Lot
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
