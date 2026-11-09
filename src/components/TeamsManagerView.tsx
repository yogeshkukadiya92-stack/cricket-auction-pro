import { ask, Empty, PageHead } from '../ui/kit';
import { processUploadedImage } from '../utils/imageUtils';
import { formatAuctionPrice } from '../utils/currency';
import React, { useState } from 'react';
import { Team, Tournament } from '../types';
import { Plus, Trash2, Shield, Users, Wallet, Trophy, Edit3, Check, Upload, Image as ImageIcon, X } from 'lucide-react';
import { TeamLogo, isImageLogo } from './TeamLogo';

interface TeamsManagerViewProps {
  teams: Team[];
  tournament: Tournament;
  tournaments: Tournament[];
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onUpdateTournament: (tourney: Tournament) => void;
  onOpenTournamentModal?: () => void;
}

export const TeamsManagerView: React.FC<TeamsManagerViewProps> = ({
  teams,
  tournament,
  tournaments,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onUpdateTournament,
  onOpenTournamentModal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(tournament.id);
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [createdMessage, setCreatedMessage] = useState('');
  const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId);
  const matchingTournaments = tournaments.filter((item) =>
    `${item.name} ${item.season} ${item.year}`.toLocaleLowerCase().includes(tournamentSearch.trim().toLocaleLowerCase())
  );

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

  const processUploadedLogo = (file: File, callback: (dataUrl: string) => void) => {
    processUploadedImage(file, 640, callback);
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
    if (!name.trim() || !selectedTournament) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      tournamentId: selectedTournament.id,
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase() || name.substring(0, 3).toUpperCase(),
      logo: logo.trim() || '🏏',
      colorHex,
      ownerName: ownerName.trim(),
      ownerMobile: ownerMobile.trim(),
      totalPurse: Number(purse),
      remainingPurse: Number(purse),
      rtmCardsLeft: Number(rtm),
    };

    onAddTeam(newTeam);
    setCreatedMessage(`${newTeam.name} added to ${selectedTournament.name} • ${selectedTournament.season} • ${selectedTournament.year}.`);
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
    <div className="space-y-5">
      <PageHead
        title="Teams"
        count={teams.length}
        actions={<button
          onClick={() => {
            setSelectedTournamentId(tournament.id);
            setTournamentSearch('');
            setPurse(tournament.totalPursePerTeam || tournament.rules?.pursePerTeam || 1000000);
            setRtm(tournament.rules?.rtmCardsPerTeam ?? 2);
            setCreatedMessage('');
            setIsAddModalOpen(true);
          }}
          className="btn btn-primary"
        ><Plus className="w-4 h-4" />Add team</button>}
      />
      {createdMessage && <p role="status" className="text-sm font-semibold text-gold-400">{createdMessage}</p>}
      {teams.length === 0 && <Empty icon={Shield} title="No teams yet" />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const left = team.totalPurse > 0 ? Math.max(0, team.remainingPurse / team.totalPurse) : 0;
          return <article key={team.id} className="tile p-4 pl-5">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: team.colorHex }} />
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 shrink-0 rounded-xl bg-obsidian-950 border border-white/10 p-1.5 grid place-items-center overflow-hidden"><TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-3xl" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-white line-clamp-2 break-words">{team.name}</h2>
                <p className="mt-1 text-xs text-slate-400 truncate">{team.shortCode}{team.ownerName ? ` · ${team.ownerName}` : ''}</p>
              </div>
              <button onClick={() => openEditModal(team)} aria-label={`Edit ${team.name}`} title="Edit" className="btn-icon"><Edit3 className="w-5 h-5" /></button>
              <button onClick={async () => { if (await ask({ title: `Delete ${team.name}?`, confirmLabel: 'Delete', danger: true })) onDeleteTeam(team.id); }} aria-label={`Delete ${team.name}`} title="Delete" className="btn-icon hover:text-red-300"><Trash2 className="w-5 h-5" /></button>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Purse left</span>
              <span className="score text-2xl text-white">{formatPrice(team.remainingPurse)} <span className="text-slate-500 text-lg">/ {formatPrice(team.totalPurse)}</span></span>
            </div>
            <span className="mt-1.5 block h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${left * 100}%`, backgroundColor: team.colorHex }} /></span>
          </article>;
        })}
      </div>

      {/* Add New Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-lg w-full max-h-[90dvh] overflow-y-auto rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl">
            <h3 className="font-display text-4xl font-extrabold uppercase text-white mb-4">Add team</h3>

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
                    <p className="text-[11px] text-slate-400">Transparent PNG looks best.
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner</label>
                  <input
                    type="text"
                    
                    placeholder="e.g. Ramesh Bhai"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner mobile</label>
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
                  disabled={!selectedTournament}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h3 className="font-display text-4xl font-extrabold uppercase text-white mb-4">Edit team</h3>

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
                    <p className="text-[11px] text-slate-400">Transparent PNG looks best.
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Owner mobile</label>
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
