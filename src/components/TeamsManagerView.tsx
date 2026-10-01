import { formatAuctionPrice } from '../utils/currency';
import React, { useState } from 'react';
import { Team, Tournament } from '../types';
import { Plus, Trash2, Shield, Users, Wallet, Trophy, Edit3, Check, Upload, Image as ImageIcon, X } from 'lucide-react';
import { TeamLogo, isImageLogo } from './TeamLogo';

interface TeamsManagerViewProps {
  teams: Team[];
  tournament: Tournament;
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onUpdateTournament: (tourney: Tournament) => void;
  onOpenTournamentModal?: () => void;
}

export const TeamsManagerView: React.FC<TeamsManagerViewProps> = ({
  teams,
  tournament,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onUpdateTournament,
  onOpenTournamentModal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // New Team Form State
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [logo, setLogo] = useState('🦁');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [purse, setPurse] = useState(tournament.totalPursePerTeam || 1000000);
  const [rtm, setRtm] = useState(2);

  // Edit Team Form State
  const [editName, setEditName] = useState('');
  const [editShortCode, setEditShortCode] = useState('');
  const [editLogo, setEditLogo] = useState('🦁');
  const [editColorHex, setEditColorHex] = useState('#3B82F6');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerMobile, setEditOwnerMobile] = useState('');
  const [editPurse, setEditPurse] = useState(1000000);
  const [editRtm, setEditRtm] = useState(2);

  // Tournament settings
  const [tourneyName, setTourneyName] = useState(tournament.name);
  const [season, setSeason] = useState(tournament.season);
  const [tourneySaved, setTourneySaved] = useState(false);

  // Helper to process uploaded PNG image and maintain transparency
  const processUploadedLogo = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          callback(canvas.toDataURL('image/png'));
        } else {
          callback(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedLogo(file, (dataUrl) => setLogo(dataUrl));
    }
  };

  const handleEditLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedLogo(file, (dataUrl) => setEditLogo(dataUrl));
    }
  };

  const openEditModal = (t: Team) => {
    setEditingTeam(t);
    setEditName(t.name);
    setEditShortCode(t.shortCode);
    setEditLogo(t.logo);
    setEditColorHex(t.colorHex);
    setEditOwnerName(t.ownerName);
    setEditOwnerMobile(t.ownerMobile || '');
    setEditPurse(t.totalPurse);
    setEditRtm(t.rtmCardsLeft);
  };

  const handleUpdateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editName.trim()) return;

    const purseDiff = Number(editPurse) - editingTeam.totalPurse;
    const updatedTeam: Team = {
      ...editingTeam,
      name: editName.trim(),
      shortCode: editShortCode.trim().toUpperCase() || editName.substring(0, 3).toUpperCase(),
      logo: editLogo.trim() || '🏏',
      colorHex: editColorHex,
      ownerName: editOwnerName.trim() || 'Franchise Owner',
      ownerMobile: editOwnerMobile.trim(),
      totalPurse: Number(editPurse),
      remainingPurse: Math.max(0, editingTeam.remainingPurse + purseDiff),
      rtmCardsLeft: Number(editRtm),
    };

    onUpdateTeam(updatedTeam);
    setEditingTeam(null);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      tournamentId: tournament.id,
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
    setLogo('🦁');
    setOwnerName('');
    setOwnerMobile('');
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
    return formatAuctionPrice(val, tournament.rules?.currency);
  };

  return (
    <div className="space-y-8">
      {/* Tournament Identity Form */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gold-400">
            <Trophy className="w-4 h-4" />
            TOURNAMENT BRAND IDENTITY
          </div>
          {onOpenTournamentModal && (
            <button
              type="button"
              onClick={onOpenTournamentModal}
              className="text-xs font-bold text-gold-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Edit Full Settings, Sponsors & Venue</span>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
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
                  <div
                    className="w-16 h-16 p-2 rounded-2xl bg-obsidian-950/90 border flex items-center justify-center overflow-hidden shrink-0 shadow-lg"
                    style={{
                      borderColor: `${team.colorHex}60`,
                      boxShadow: `0 0 15px -3px ${team.colorHex}30`,
                    }}
                  >
                    <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-3xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white font-display">{team.name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                      {team.shortCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(team)}
                    className="p-2 rounded-xl text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 transition-colors cursor-pointer"
                    title="Edit Team & Upload Logo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${team.name}?`)) {
                        onDeleteTeam(team.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white uppercase focus:border-gold-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Team Logo Section (PNG File Upload + Emoji support) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-gold-400" />
                    Team Logo (PNG Image or Emoji)
                  </label>
                  {isImageLogo(logo) && (
                    <button
                      type="button"
                      onClick={() => setLogo('🦁')}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <X className="w-3 h-3" />
                      Remove PNG
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Live Preview */}
                  <div
                    className="w-20 h-20 rounded-2xl p-2 bg-obsidian-950 border-2 flex items-center justify-center relative overflow-hidden shadow-lg shrink-0 group transition-all"
                    style={{
                      borderColor: colorHex,
                      boxShadow: `0 0 20px -3px ${colorHex}50`,
                    }}
                  >
                    <TeamLogo logo={logo} name={name || 'Team'} className="w-full h-full text-4xl" />
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <label className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-400/30 text-xs font-bold cursor-pointer transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PNG Logo File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Upload transparent PNG for best 3D stage and screen display.
                    </p>

                    {/* Quick Emoji Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 justify-center sm:justify-start">
                      <span className="text-[10px] text-slate-500 font-bold mr-1">Presets:</span>
                      {['🦁', '👑', '⚔️', '⚡', '🌪️', '🦅', '🐯', '🦈', '🚀', '🏏'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setLogo(em)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                            logo === em
                              ? 'bg-gold-500/20 border border-gold-400 shadow-glow-gold scale-110'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color & Purse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner Mobile (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98250 12345"
                    value={ownerMobile}
                    onChange={(e) => setOwnerMobile(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Existing Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-lg w-full rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black text-white font-display mb-1">EDIT FRANCHISE TEAM</h3>
            <p className="text-xs text-slate-400 mb-6">Update team logo, name, colors, and purse allocation.</p>

            <form onSubmit={handleUpdateTeamSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Short Code</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editShortCode}
                    onChange={(e) => setEditShortCode(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white uppercase focus:border-gold-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Team Logo Section (PNG File Upload + Emoji support) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-gold-400" />
                    Team Logo (PNG Image or Emoji)
                  </label>
                  {isImageLogo(editLogo) && (
                    <button
                      type="button"
                      onClick={() => setEditLogo('🦁')}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <X className="w-3 h-3" />
                      Remove PNG
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Live Preview */}
                  <div
                    className="w-20 h-20 rounded-2xl p-2 bg-obsidian-950 border-2 flex items-center justify-center relative overflow-hidden shadow-lg shrink-0 group transition-all"
                    style={{
                      borderColor: editColorHex,
                      boxShadow: `0 0 20px -3px ${editColorHex}50`,
                    }}
                  >
                    <TeamLogo logo={editLogo} name={editName || 'Team'} className="w-full h-full text-4xl" />
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <label className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-400/30 text-xs font-bold cursor-pointer transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PNG Logo File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleEditLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Upload transparent PNG for best 3D stage and screen display.
                    </p>

                    {/* Quick Emoji Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 justify-center sm:justify-start">
                      <span className="text-[10px] text-slate-500 font-bold mr-1">Presets:</span>
                      {['🦁', '👑', '⚔️', '⚡', '🌪️', '🦅', '🐯', '🦈', '🚀', '🏏'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setEditLogo(em)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                            editLogo === em
                              ? 'bg-gold-500/20 border border-gold-400 shadow-glow-gold scale-110'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color & Purse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Team Color Hex</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColorHex}
                      onChange={(e) => setEditColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={editColorHex}
                      onChange={(e) => setEditColorHex(e.target.value)}
                      className="flex-1 bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Purse Budget (₹)</label>
                  <input
                    type="number"
                    step="50000"
                    value={editPurse}
                    onChange={(e) => setEditPurse(Number(e.target.value))}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={editOwnerMobile}
                    onChange={(e) => setEditOwnerMobile(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
