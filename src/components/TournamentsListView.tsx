import React from 'react';
import { Tournament, Team, Player } from '../types';
import { TeamLogo } from './TeamLogo';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Users,
  Shield,
  Edit3,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Award,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface TournamentsListViewProps {
  tournaments: Tournament[];
  activeTournamentId: string;
  teams: Team[];
  players: Player[];
  onSelectTournament: (tournamentId: string) => void;
  onEditTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournamentId: string) => void;
  onCreateNewTournament: () => void;
}

export const TournamentsListView: React.FC<TournamentsListViewProps> = ({
  tournaments,
  activeTournamentId,
  teams,
  players,
  onSelectTournament,
  onEditTournament,
  onDeleteTournament,
  onCreateNewTournament,
}) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gold-400 mb-1">
            <Trophy className="w-4 h-4" />
            TOURNAMENT MANAGEMENT HUB
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
            ALL CRICKET TOURNAMENTS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create, switch, and manage independent mega auction tournaments, teams, and registrations.
          </p>
        </div>

        <button
          onClick={onCreateNewTournament}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs bg-gradient-to-r from-gold-500 to-amber-400 text-black hover:from-gold-400 hover:to-amber-300 shadow-glow-gold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Tournament</span>
        </button>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tourney) => {
          const isActive = tourney.id === activeTournamentId;
          const tourneyTeams = teams.filter((t) => !t.tournamentId || t.tournamentId === tourney.id);
          const tourneyPlayers = players.filter((p) => !p.tournamentId || p.tournamentId === tourney.id);

          return (
            <div
              key={tourney.id}
              className={`rounded-3xl p-6 glass-panel border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                isActive
                  ? 'border-gold-400 shadow-glow-gold bg-gold-500/[0.03]'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-400 text-gold-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <CheckCircle2 className="w-3 h-3" />
                  ACTIVE NOW
                </div>
              )}

              <div className="space-y-4">
                {/* Logo & Basic Info */}
                <div className="flex items-start gap-4 pr-16">
                  <div className="w-16 h-16 rounded-2xl bg-obsidian-950 border border-white/10 p-2 flex items-center justify-center shrink-0 shadow-lg">
                    <TeamLogo logo={tourney.logoUrl || '🏆'} name={tourney.name} className="w-full h-full text-3xl" />
                  </div>

                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block ${
                      tourney.status === 'LIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/40'
                        : tourney.status === 'UPCOMING'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-400/40'
                        : 'bg-slate-500/15 text-slate-300 border-slate-400/40'
                    }`}>
                      {tourney.status}
                    </span>
                    <h3 className="text-lg font-black text-white font-display line-clamp-1 group-hover:text-gold-400 transition-colors">
                      {tourney.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      {tourney.season} • {tourney.year}
                    </p>
                  </div>
                </div>

                {/* Venue & Dates */}
                {(tourney.ground || tourney.startDate) && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs text-slate-300">
                    {tourney.ground && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">
                          {tourney.ground} {tourney.city ? `(${tourney.city})` : ''}
                        </span>
                      </div>
                    )}
                    {tourney.startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-electric-cyan shrink-0" />
                        <span>
                          {tourney.startDate} {tourney.endDate ? `to ${tourney.endDate}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sponsors */}
                {tourney.sponsor && (
                  <div className="text-[11px] p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-1.5 text-slate-300 truncate">
                    <Award className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    <span>Sponsor: <strong className="text-white">{tourney.sponsor}</strong></span>
                  </div>
                )}

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 rounded-xl bg-obsidian-950/60 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Teams</span>
                    <span className="text-xs font-black text-electric-cyan font-mono">
                      {tourneyTeams.length} / {tourney.expectedTeamsCount || 8}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-obsidian-950/60 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Players</span>
                    <span className="text-xs font-black text-purple-400 font-mono">
                      {tourneyPlayers.length}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-obsidian-950/60 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Base Price</span>
                    <span className="text-xs font-black text-gold-400 font-mono">
                      {formatPrice(tourney.defaultBasePrice || 20000)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditTournament(tourney)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Edit Tournament Info"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {tournaments.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete tournament "${tourney.name}"?`)) {
                          onDeleteTournament(tourney.id);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Tournament"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectTournament(tourney.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gold-500 text-black shadow-glow-gold font-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <span>{isActive ? 'Opened Dashboard' : 'Select Tournament'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
