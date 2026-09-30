import React, { useState, useRef } from 'react';
import { Player, PlayerRole, PlayerCategory } from '../types';
import {
  downloadSampleCsvTemplate,
  exportPlayersToCsv,
  parseCsvToPlayers,
} from '../utils/csvHelper';
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
} from 'lucide-react';

interface PlayerManagerViewProps {
  players: Player[];
  onAddPlayer: (newPlayer: Player) => void;
  onBulkAddPlayers?: (newPlayers: Player[]) => void;
  onDeletePlayer: (playerId: string) => void;
}

export const PlayerManagerView: React.FC<PlayerManagerViewProps> = ({
  players,
  onAddPlayer,
  onBulkAddPlayers,
  onDeletePlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
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
  const [basePrice, setBasePrice] = useState<number>(30000);
  const [battingStyle, setBattingStyle] = useState('Right Hand Batsman');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [matches, setMatches] = useState(15);
  const [runs, setRuns] = useState(350);
  const [wickets, setWickets] = useState(12);
  const [strikeRate, setStrikeRate] = useState(135.0);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=80'
  );

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
    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
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
            onClick={() => exportPlayersToCsv(players)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Export all current players to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export
          </button>

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

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="rounded-2xl border border-white/10 bg-obsidian-900/80 p-4 flex flex-col justify-between hover:border-gold-400/40 transition-all group"
          >
            <div>
              <div className="relative w-full h-44 rounded-xl overflow-hidden mb-3 bg-obsidian-950">
                <img
                  src={player.photoUrl}
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
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
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
          </div>
        ))}
      </div>

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
                    src={photoUrl}
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
    </div>
  );
};
