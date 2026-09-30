import React, { useState } from 'react';
import { Team, Tournament } from '../types';
import { Plus, Trash2, Shield, Users, Wallet, Trophy, Edit3, Check } from 'lucide-react';

interface TeamsManagerViewProps {
  teams: Team[];
  tournament: Tournament;
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onUpdateTournament: (tourney: Tournament) => void;
}

export const TeamsManagerView: React.FC<TeamsManagerViewProps> = ({
  teams,
  tournament,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onUpdateTournament,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Team Form
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [logo, setLogo] = useState('🦁');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [purse, setPurse] = useState(1000000);
  const [rtm, setRtm] = useState(2);

  // Tournament settings
  const [tourneyName, setTourneyName] = useState(tournament.name);
  const [season, setSeason] = useState(tournament.season);
  const [tourneySaved, setTourneySaved] = useState(false);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase() || name.substring(0, 3).toUpperCase(),
      logo: logo.trim() || '🏏',
      colorHex,
      ownerName: ownerName.trim() || 'Franchise Owner',
      ownerMobile: ownerMobile.trim(),
      totalPurse: Number(purse),
      remainingPurse: Number(purse),
      rtmCardsLeft: Number(rtm),
    };

    onAddTeam(newTeam);
    setIsAddModalOpen(false);
    // Reset
    setName('');
    setShortCode('');
    setOwnerName('');
  };

  const handleSaveTourney = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTournament({
      ...tournament,
      name: tourneyName,
      season,
    });
    setTourneySaved(true);
    setTimeout(() => setTourneySaved(false), 2000);
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Tournament Identity Form */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gold-400 mb-3">
          <Trophy className="w-4 h-4" />
          TOURNAMENT BRAND IDENTITY
        </div>
        <form onSubmit={handleSaveTourney} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Tournament Title</label>
            <input
              type="text"
              value={tourneyName}
              onChange={(e) => setTourneyName(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Season / Edition</label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:border-gold-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            {tourneySaved ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {tourneySaved ? 'Updated!' : 'Save Tournament Info'}
          </button>
        </form>
      </div>

      {/* Teams Management Header */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-display flex items-center gap-2">
            🛡️ FRANCHISE TEAMS ({teams.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure participating franchise teams, logos, theme colors, purse allocation, and owners.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Team
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            className="rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300"
            style={{
              backgroundColor: `${team.colorHex}15`,
              borderColor: `${team.colorHex}50`,
              boxShadow: `0 0 30px -5px ${team.colorHex}25`,
            }}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-4xl p-2 rounded-2xl bg-obsidian-950/80 border border-white/10">
                    {team.logo}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-white font-display">{team.name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                      {team.shortCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${team.name}?`)) {
                      onDeleteTeam(team.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Owner:</span>
                  <span className="font-bold text-white">{team.ownerName}</span>
                </div>
                {team.ownerMobile && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Contact:</span>
                    <span className="font-mono">{team.ownerMobile}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-300">
                  <span>Total Purse:</span>
                  <span className="font-bold font-mono text-gold-400">{formatPrice(team.totalPurse)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Remaining Purse:</span>
                  <span className="font-bold font-mono text-emerald-400">
                    {formatPrice(team.remainingPurse)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Theme Color:</span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: team.colorHex }} />
                <span className="font-mono">{team.colorHex}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-lg w-full rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black text-white font-display mb-1">ADD FRANCHISE TEAM</h3>
            <p className="text-xs text-slate-400 mb-6">Create a team with logo, custom color, and purse.</p>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Surat Strikers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Short Code</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. STR"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white uppercase focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Team Logo Emoji or Icon</label>
                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xl text-center text-white focus:border-gold-400 focus:outline-none"
                    placeholder="🦁"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Team Color Hex</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="flex-1 bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Bhai"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Purse Budget (₹)</label>
                  <input
                    type="number"
                    step="50000"
                    value={purse}
                    onChange={(e) => setPurse(Number(e.target.value))}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

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
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
