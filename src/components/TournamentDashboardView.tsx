import React, { useState } from 'react';
import { Tournament, Team, Player, ViewMode } from '../types';
import { TeamLogo, isImageLogo } from './TeamLogo';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Shield,
  DollarSign,
  Tv,
  Mic,
  Hand,
  ClipboardList,
  Radio,
  FileSpreadsheet,
  Share2,
  ExternalLink,
  Edit3,
  Plus,
  CheckCircle2,
  Clock,
  Award,
  Wallet,
  Check,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface TournamentDashboardViewProps {
  tournament: Tournament;
  allTournaments: Tournament[];
  teams: Team[];
  players: Player[];
  onSelectViewMode: (mode: ViewMode) => void;
  onEditTournament: () => void;
  onSwitchTournament: () => void;
  onCreateNewTournament: () => void;
  onApprovePlayer?: (id: string) => void;
  onRejectPlayer?: (id: string) => void;
}

export const TournamentDashboardView: React.FC<TournamentDashboardViewProps> = ({
  tournament,
  allTournaments,
  teams,
  players,
  onSelectViewMode,
  onEditTournament,
  onSwitchTournament,
  onCreateNewTournament,
  onApprovePlayer,
  onRejectPlayer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Scoped stats for this tournament
  const tourneyTeams = teams.filter((t) => !t.tournamentId || t.tournamentId === tournament.id);
  const tourneyPlayers = players.filter((p) => !p.tournamentId || p.tournamentId === tournament.id);

  const registeredCount = tourneyPlayers.length;
  const approvedCount = tourneyPlayers.filter((p) => p.approvalStatus === 'APPROVED').length;
  const pendingCount = tourneyPlayers.filter((p) => p.approvalStatus === 'PENDING' || !p.approvalStatus).length;
  const paidCount = tourneyPlayers.filter(
    (p) => p.paymentStatus === 'PAID' || p.paymentStatus === 'VERIFIED'
  ).length;

  const soldCount = tourneyPlayers.filter((p) => p.status === 'SOLD').length;
  const unsoldCount = tourneyPlayers.filter((p) => p.status === 'UNSOLD').length;
  const availableCount = tourneyPlayers.filter((p) => p.status === 'AVAILABLE' || !p.status).length;

  const totalPurseAllocated = tourneyTeams.reduce((sum, t) => sum + (t.totalPurse || 0), 0);
  const totalPurseRemaining = tourneyTeams.reduce((sum, t) => sum + (t.remainingPurse || 0), 0);
  const totalMoneySpent = totalPurseAllocated - totalPurseRemaining;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getPublicRegistrationUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?tournamentId=${tournament.id}&mode=register`;
  };

  const handleCopyLink = () => {
    const url = getPublicRegistrationUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Ultra-Luxury Tournament Identity Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-obsidian-900 via-obsidian-850 to-obsidian-950 border border-gold-400/30 shadow-2xl overflow-hidden">
        {/* Ambient Glow background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-electric-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-obsidian-950 border-2 border-gold-400/50 p-3 shadow-glow-gold flex items-center justify-center shrink-0">
              <TeamLogo logo={tournament.logoUrl || '🏆'} name={tournament.name} className="w-full h-full text-5xl" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  tournament.status === 'LIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40 animate-pulse'
                    : tournament.status === 'UPCOMING'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-400/40'
                    : 'bg-slate-500/20 text-slate-300 border-slate-400/40'
                }`}>
                  ● {tournament.status}
                </span>

                {tournament.ballType && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
                    🏏 {tournament.ballType}
                  </span>
                )}

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/10 text-gold-400 border border-gold-400/30">
                  {tournament.year}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
                {tournament.name}
              </h1>

              <p className="text-sm font-semibold text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="text-gold-400 font-bold">{tournament.season}</span>
                {tournament.ground && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {tournament.ground} {tournament.city ? `(${tournament.city})` : ''}
                    </span>
                  </>
                )}
                {tournament.startDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-electric-cyan" />
                      {tournament.startDate} {tournament.endDate ? `to ${tournament.endDate}` : ''}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons Top Right */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onEditTournament}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-gold-400" />
              <span>Edit Info</span>
            </button>

            <button
              onClick={onSwitchTournament}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>All Tournaments ({allTournaments.length})</span>
            </button>

            <button
              onClick={onCreateNewTournament}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-gold-500 to-amber-400 text-black shadow-glow-gold hover:from-gold-400 hover:to-amber-300 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Tournament</span>
            </button>
          </div>
        </div>

        {/* Sponsors Showcase Banner (if provided) */}
        {(tournament.sponsor || tournament.coSponsors) && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-gold-400" />
                TITLE SPONSOR:
              </span>
              <span className="text-sm font-black text-white px-3 py-1 rounded-xl bg-gold-500/10 border border-gold-400/30">
                {tournament.sponsor || 'Official Sponsor'}
              </span>
            </div>

            {tournament.coSponsors && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">CO-SPONSORS:</span>
                {tournament.coSponsors.split(',').map((cs, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300"
                  >
                    {cs.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Key Metrics & Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Player Registrations */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-gold-400/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {paidCount} Paid
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white font-display">{registeredCount}</div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Total Player Registrations</p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Approved: <strong className="text-emerald-400">{approvedCount}</strong></span>
            <span>Pending: <strong className="text-amber-400">{pendingCount}</strong></span>
          </div>

          <button
            onClick={() => onSelectViewMode('PLAYERS')}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            Review Player List <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
          </button>
        </div>

        {/* Card 2: Franchise Teams */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-electric-cyan/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-electric-cyan">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Target: {tournament.expectedTeamsCount || 8} Teams
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white font-display">
              {tourneyTeams.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {tournament.expectedTeamsCount || 8}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Participating Teams</p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Total Purse:</span>
            <span className="text-gold-400 font-mono font-bold">{formatPrice(totalPurseAllocated)}</span>
          </div>

          <button
            onClick={() => onSelectViewMode('TEAMS')}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            Manage Franchises <ArrowRight className="w-3.5 h-3.5 text-electric-cyan" />
          </button>
        </div>

        {/* Card 3: Base Price & Economy */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-emerald-400/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Purse/Team: {formatPrice(tournament.totalPursePerTeam || 1000000)}
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-gold-400 font-display font-mono">
              {formatPrice(tournament.defaultBasePrice || 20000)}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Player Default Base Price</p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Spent in Auction:</span>
            <span className="text-emerald-400 font-mono font-bold">{formatPrice(totalMoneySpent)}</span>
          </div>

          <button
            onClick={() => onSelectViewMode('RULES')}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            Auction Rules <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

        {/* Card 4: Auction Pool Status */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-purple-400/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-gold-400">
              {soldCount} Sold
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white font-display">
              {availableCount}{' '}
              <span className="text-sm font-normal text-slate-400">in lot</span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Available for Bidding</p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Unsold: <strong className="text-red-400">{unsoldCount}</strong></span>
            <span>Completed: <strong className="text-emerald-400">{soldCount}</strong></span>
          </div>

          <button
            onClick={() => onSelectViewMode('STAGE')}
            className="w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-500 to-amber-400 text-black hover:from-gold-400 hover:to-amber-300 font-black transition-all flex items-center justify-center gap-1.5 shadow-glow-gold"
          >
            Enter Auction Stage <Tv className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>

      {/* 3. Shareable Registration Link Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-obsidian-900 to-purple-950/60 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ClipboardList className="w-4 h-4 text-purple-400" />
            <h3 className="text-base font-black text-white font-display">
              PUBLIC PLAYER REGISTRATION LINK
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            Send this official registration link to players on WhatsApp or Instagram so they can submit details & pay registration fees.
          </p>
          <div className="text-[11px] font-mono text-purple-300 truncate max-w-xl">
            {getPublicRegistrationUrl()}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              copiedLink
                ? 'bg-emerald-500 text-black shadow-glow-emerald font-black'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
            }`}
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>

          <button
            onClick={() => onSelectViewMode('PUBLIC_REGISTER')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all"
          >
            <ExternalLink className="w-4 h-4 text-gold-400" />
            <span>Open Form</span>
          </button>

          <button
            onClick={() => onSelectViewMode('FORM_BUILDER')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 transition-all"
            title="Custom Form Builder"
          >
            ⚙️ Edit Form
          </button>
        </div>
      </div>

      {/* 4. Quick Command Navigation Grid */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          ⚡ QUICK COMMAND LAUNCHERS
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onSelectViewMode('STAGE')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-gold-400/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <Tv className="w-6 h-6 text-gold-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Stage Arena</span>
            <span className="text-[10px] text-slate-400">Main screen display</span>
          </button>

          <button
            onClick={() => onSelectViewMode('AUCTIONEER')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-amber-400/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <Mic className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Auctioneer Desk</span>
            <span className="text-[10px] text-slate-400">Hammer & sold controls</span>
          </button>

          <button
            onClick={() => onSelectViewMode('PADDLE')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-electric-cyan/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <Hand className="w-6 h-6 text-electric-cyan group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Franchise Paddle</span>
            <span className="text-[10px] text-slate-400">Live bidding touch pad</span>
          </button>

          <button
            onClick={() => onSelectViewMode('TEAMS')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-emerald-400/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <Shield className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Franchises ({tourneyTeams.length})</span>
            <span className="text-[10px] text-slate-400">Logos & purse budgets</span>
          </button>

          <button
            onClick={() => onSelectViewMode('SQUADS')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-purple-400/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <FileSpreadsheet className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Squad Booklets</span>
            <span className="text-[10px] text-slate-400">PDFs & social posters</span>
          </button>

          <button
            onClick={() => onSelectViewMode('OBS')}
            className="p-4 rounded-2xl glass-panel border border-white/10 hover:border-rose-400/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-center group"
          >
            <Radio className="w-6 h-6 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">OBS Studio Stream</span>
            <span className="text-[10px] text-slate-400">Transparent overlay</span>
          </button>
        </div>
      </div>

      {/* 5. Participating Teams Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold-400" />
            PARTICIPATING TEAMS ({tourneyTeams.length})
          </h3>
          <button
            onClick={() => onSelectViewMode('TEAMS')}
            className="text-xs font-bold text-gold-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            Manage Teams & Logos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {tourneyTeams.length === 0 ? (
          <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-3">
            <p className="text-slate-400 text-xs">No teams added to this tournament yet.</p>
            <button
              onClick={() => onSelectViewMode('TEAMS')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gold-500/10 text-gold-400 border border-gold-400/30 hover:bg-gold-500/20"
            >
              + Add First Franchise Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tourneyTeams.map((team) => {
              const teamBoughtPlayers = tourneyPlayers.filter((p) => p.soldToTeamId === team.id);
              return (
                <div
                  key={team.id}
                  className="p-4 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: `${team.colorHex}10`,
                    borderColor: `${team.colorHex}40`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 p-1 rounded-xl bg-obsidian-950 border border-white/10 flex items-center justify-center shrink-0">
                      <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-2xl" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white font-display truncate">{team.name}</h4>
                      <p className="text-[11px] text-slate-400">Owner: {team.ownerName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-white/5">
                    <div className="p-1.5 rounded-lg bg-obsidian-950/60">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Purse Left</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        {formatPrice(team.remainingPurse)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-obsidian-950/60">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Players</span>
                      <span className="text-xs font-black text-white font-mono">
                        {teamBoughtPlayers.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Recent Registrations Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            LATEST PLAYER REGISTRATIONS ({tourneyPlayers.length})
          </h3>
          <button
            onClick={() => onSelectViewMode('PLAYERS')}
            className="text-xs font-bold text-gold-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            View All Registrations <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {tourneyPlayers.length === 0 ? (
          <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-3">
            <p className="text-slate-400 text-xs">No player registrations yet.</p>
            <button
              onClick={() => onSelectViewMode('PUBLIC_REGISTER')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-400/30 hover:bg-purple-500/20"
            >
              Open Player Registration Form
            </button>
          </div>
        ) : (
          <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-white/5">
                  <tr>
                    <th className="p-3.5">Player</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">City / Mobile</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tourneyPlayers.slice(0, 5).map((player) => (
                    <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-9 h-9 rounded-xl object-cover border border-white/10"
                          />
                          <div>
                            <span className="font-bold text-white block">{player.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Base: {formatPrice(player.basePrice || tournament.defaultBasePrice || 20000)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-300">
                        {player.role}
                      </td>

                      <td className="p-3.5 text-slate-300">
                        <div>{player.city || 'Gujarat'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{player.mobile || '-'}</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          player.paymentStatus === 'VERIFIED' || player.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {player.paymentStatus || 'PENDING'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          player.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : player.approvalStatus === 'REJECTED'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {player.approvalStatus || 'PENDING'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        {player.approvalStatus !== 'APPROVED' && onApprovePlayer && (
                          <button
                            onClick={() => onApprovePlayer(player.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-all mr-1.5"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => onSelectViewMode('PLAYERS')}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-bold transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
