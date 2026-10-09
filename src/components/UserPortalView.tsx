import React, { useState, useMemo } from 'react';
import { Tournament, Team, Player, User, ViewMode, PlayerRole } from '../types';
import { TeamLogo } from './TeamLogo';
import { compressForLowBandwidth } from '../utils/imageUtils';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Tv,
  ArrowRight,
  Shield,
  DollarSign,
  User as UserIcon,
  Sparkles,
  Award,
  Zap,
  Phone,
  Mail,
  Edit3,
  Check,
  Flame,
  FileText,
  CreditCard,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface UserPortalViewProps {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  currentUser: User | null;
  onSelectTournament: (tournamentId: string) => void;
  onOpenRegisterForTournament: (tournament: Tournament) => void;
  onOpenSpectatorForTournament: (tournament: Tournament) => void;
  onSwitchToOrganizerPortal: () => void;
  onOpenAuthModal: () => void;
  onUpdateCurrentUser?: (user: User) => void;
}

export const UserPortalView: React.FC<UserPortalViewProps> = ({
  tournaments,
  teams,
  players,
  currentUser,
  onSelectTournament,
  onOpenRegisterForTournament,
  onOpenSpectatorForTournament,
  onSwitchToOrganizerPortal,
  onOpenAuthModal,
  onUpdateCurrentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL_TOURNAMENTS' | 'MY_PARTICIPATION' | 'MY_PROFILE'>('ALL_TOURNAMENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [sportFilter, setSportFilter] = useState<string>('ALL');

  // Lookup for guest users (email or mobile lookup)
  const [guestLookupQuery, setGuestLookupQuery] = useState('');

  // Player Profile State
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileMobile, setProfileMobile] = useState(currentUser?.mobile || '');
  const [profileCity, setProfileCity] = useState(currentUser?.playerProfile?.city || '');
  const [profileRole, setProfileRole] = useState<PlayerRole>(currentUser?.playerProfile?.role || 'ALL_ROUNDER');
  const [profileBatting, setProfileBatting] = useState(currentUser?.playerProfile?.battingStyle || 'Right Hand Batsman');
  const [profileBowling, setProfileBowling] = useState(currentUser?.playerProfile?.bowlingStyle || 'Right Arm Medium Fast');
  const [profilePhoto, setProfilePhoto] = useState(
    currentUser?.playerProfile?.photoUrl ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'
  );
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Active email/mobile to match user's participated tournaments
  const lookupEmail = (currentUser?.email || guestLookupQuery).trim().toLowerCase();
  const lookupMobile = (currentUser?.mobile || guestLookupQuery).trim();

  // Find all players matching the current user/guest across all tournaments
  const myPlayerRegistrations = useMemo(() => {
    if (!lookupEmail && !lookupMobile) return [];
    return players.filter((p) => {
      const emailMatch = lookupEmail && p.email && p.email.toLowerCase() === lookupEmail;
      const mobileMatch = lookupMobile && p.mobile && p.mobile.includes(lookupMobile);
      const nameMatch = currentUser?.name && p.name && p.name.toLowerCase() === currentUser.name.toLowerCase();
      return emailMatch || mobileMatch || nameMatch;
    });
  }, [players, lookupEmail, lookupMobile, currentUser]);

  // Map each participation to its tournament & team
  const myParticipatedTournaments = useMemo(() => {
    return myPlayerRegistrations.map((playerRecord) => {
      const tourney = tournaments.find((t) => t.id === playerRecord.tournamentId) || {
        id: playerRecord.tournamentId || 'unknown',
        name: 'Tournament League',
        year: 2026,
        season: 'Season 1',
        status: 'LIVE' as const,
        defaultBasePrice: playerRecord.basePrice || 25000,
      };

      const soldTeam = playerRecord.soldToTeamId
        ? teams.find((tm) => tm.id === playerRecord.soldToTeamId) || null
        : null;

      return {
        player: playerRecord,
        tournament: tourney,
        team: soldTeam,
      };
    });
  }, [myPlayerRegistrations, tournaments, teams]);

  // Filtered all tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.ground && t.ground.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesSport = sportFilter === 'ALL' || (t.sportType || 'CRICKET') === sportFilter;

      return matchesSearch && matchesStatus && matchesSport;
    });
  }, [tournaments, searchQuery, statusFilter, sportFilter]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const updatedUser: User = {
      ...(currentUser || {
        id: `usr-${Date.now()}`,
        name: profileName,
        email: profileEmail,
        role: 'USER',
        status: 'ACTIVE',
      }),
      name: profileName,
      email: profileEmail,
      mobile: profileMobile,
      playerProfile: {
        name: profileName,
        email: profileEmail,
        mobile: profileMobile,
        city: profileCity,
        role: profileRole,
        battingStyle: profileBatting,
        bowlingStyle: profileBowling,
        photoUrl: profilePhoto,
      },
    };

    localStorage.setItem('cap_current_user', JSON.stringify(updatedUser));
    if (onUpdateCurrentUser) onUpdateCurrentUser(updatedUser);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressForLowBandwidth(file, (dataUrl) => {
        setProfilePhoto(dataUrl);
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-slate-900 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Player & Spectator Arena</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
              {currentUser ? `Welcome back, ${currentUser.name}! 🏏` : 'Explore Leagues & Track Your Auction'}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              તમામ ક્રિકેટ ટૂર્નામેન્ટ્સ જુઓ, નવા ઓક્શનમાં સીધા ભાગ લો (Participate) અને તમારી બોલી, સિલેક્શન અને પેમેન્ટ સ્ટેટસ લાઈવ ટ્રેક કરો.
            </p>
          </div>

          {/* Quick Action / Switch to Organizer Portal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onSwitchToOrganizerPortal}
              className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition backdrop-blur-md shadow-lg"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Organizer Portal</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {!currentUser && (
              <button
                onClick={onOpenAuthModal}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
              >
                <UserIcon className="w-4 h-4 text-slate-950" />
                <span>Player Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400">Total Tournaments</span>
            <p className="text-xl font-black text-white mt-0.5">{tournaments.length}</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400">Live Auctions Now</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {tournaments.filter((t) => t.status === 'LIVE').length}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400">My Participations</span>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {myParticipatedTournaments.length}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-slate-400">Total Registered Players</span>
            <p className="text-xl font-black text-cyan-400 mt-0.5">{players.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('ALL_TOURNAMENTS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ALL_TOURNAMENTS'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>All Tournaments ({tournaments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MY_PARTICIPATION')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'MY_PARTICIPATION'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>My Registered Tournaments</span>
            {myParticipatedTournaments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black">
                {myParticipatedTournaments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('MY_PROFILE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'MY_PROFILE'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>My Player Profile</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ALL TOURNAMENTS */}
      {activeTab === 'ALL_TOURNAMENTS' && (
        <div className="space-y-6">
          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-obsidian-900 border border-white/10">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournament, city, or ground..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-white/5">
                {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      statusFilter === st
                        ? 'bg-amber-500 text-slate-950 shadow font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tournaments Grid */}
          {filteredTournaments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-obsidian-900/60 border border-white/10 space-y-3">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No tournaments match your search</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try adjusting your search query or status filter to discover tournaments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTournaments.map((t) => {
                const tourneyTeams = teams.filter((tm) => tm.tournamentId === t.id);
                const tourneyPlayers = players.filter((p) => p.tournamentId === t.id);
                const isUserParticipating = myParticipatedTournaments.some((mp) => mp.tournament.id === t.id);

                return (
                  <div
                    key={t.id}
                    className="group relative rounded-3xl bg-gradient-to-b from-obsidian-900 to-obsidian-950 border border-white/10 hover:border-amber-500/40 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Status Bar */}
                    <div className="p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            t.status === 'LIVE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : t.status === 'UPCOMING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {t.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                          {t.status}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400">
                          {t.sportType || 'CRICKET'} • {t.year}
                        </span>
                      </div>

                      {/* Header Logo & Title */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-obsidian-950 p-1.5 border border-white/15 shrink-0 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <TeamLogo logo={t.logoUrl || '🏆'} name={t.name} className="w-full h-full text-xl" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors truncate">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            {t.season} {t.sponsor ? `• Powered by ${t.sponsor}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Key Details Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-xs text-slate-300">
                        {t.ground && (
                          <div className="flex items-center gap-1.5 text-slate-400 truncate">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{t.ground}, {t.city || 'India'}</span>
                          </div>
                        )}
                        {t.startDate && (
                          <div className="flex items-center gap-1.5 text-slate-400 truncate">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{t.startDate}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{tourneyTeams.length} Teams • {tourneyPlayers.length} Players</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Entry: {t.registrationFee ? `₹${t.registrationFee.toLocaleString('en-IN')}` : 'Free'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 bg-obsidian-950/60 border-t border-white/10 flex items-center gap-2">
                      {isUserParticipating ? (
                        <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Already Registered</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenRegisterForTournament(t)}
                          className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition"
                        >
                          <Zap className="w-3.5 h-3.5 text-slate-950" />
                          <span>Participate</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenSpectatorForTournament(t)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition"
                        title="Watch Live Auction Stream"
                      >
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Spectator</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY PARTICIPATED TOURNAMENTS */}
      {activeTab === 'MY_PARTICIPATION' && (
        <div className="space-y-6">
          {/* Guest Lookup Banner (If not signed in or wants to check another mobile/email) */}
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {currentUser
                  ? `Showing registrations for ${currentUser.name} (${currentUser.email || currentUser.mobile})`
                  : 'Enter your registered mobile or email to find your tournament registrations:'}
              </span>
            </div>

            {!currentUser && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={guestLookupQuery}
                  onChange={(e) => setGuestLookupQuery(e.target.value)}
                  placeholder="e.g. 9825012345 or email@..."
                  className="px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Participation Cards */}
          {myParticipatedTournaments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-obsidian-900/60 border border-white/10 space-y-4">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No tournament participations found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                તમે હજી સુધી કોઈ ટૂર્નામેન્ટમાં રજીસ્ટ્રેશન કર્યું નથી. "All Tournaments" ટેબમાં જઈને મનગમતી ટૂર્નામેન્ટમાં ૧-ક્લિકથી ભાગ લો!
              </p>
              <button
                onClick={() => setActiveTab('ALL_TOURNAMENTS')}
                className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
              >
                Browse All Tournaments
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myParticipatedTournaments.map(({ player, tournament: tourney, team: boughtTeam }) => {
                const isSold = player.status === 'SOLD' && boughtTeam;
                const isUnsold = player.status === 'UNSOLD';
                const isApproved = player.approvalStatus === 'APPROVED';
                const isRejected = player.approvalStatus === 'REJECTED';

                return (
                  <div
                    key={`${player.id}-${tourney.id}`}
                    className="p-6 rounded-3xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-slate-900 border border-white/10 hover:border-amber-500/30 transition shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      {/* Tournament info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-obsidian-950 p-1 border border-white/15 shrink-0 flex items-center justify-center">
                          <TeamLogo logo={tourney.logoUrl || '🏆'} name={tourney.name} className="w-full h-full text-xl" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">{tourney.name}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/10 text-slate-300">
                              {tourney.year}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{tourney.season} • {tourney.city || 'India'}</p>
                        </div>
                      </div>

                      {/* Approval Status Badge */}
                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registration Approved</span>
                          </div>
                        ) : isRejected ? (
                          <div className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Registration Rejected</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>Verification Pending</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auction Outcome Spotlight */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Auction Result */}
                      <div className={`p-4 rounded-2xl border ${
                        isSold
                          ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300'
                          : isUnsold
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Auction Result
                        </span>
                        {isSold ? (
                          <div>
                            <div className="text-lg font-black text-white flex items-center gap-2">
                              <span>🏆 SOLD to {boughtTeam.name}</span>
                            </div>
                            <p className="text-sm font-extrabold text-emerald-400 mt-1">
                              Final Price: ₹{(player.soldPrice || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        ) : isUnsold ? (
                          <div>
                            <span className="text-base font-bold text-rose-400">Unsold in Round 1</span>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Eligible for Accelerated Round 2 / Lucky Draw pool
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-base font-bold text-amber-400">In Auction Lot</span>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Base Price: ₹{(player.basePrice || 25000).toLocaleString('en-IN')} • Lot #{player.lotOrder || 1}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 2. Registered Player Details */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          My Player Details
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Player Name:</span>
                          <span className="text-white font-bold">{player.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Role:</span>
                          <span className="text-amber-400 font-bold">{player.role}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Category:</span>
                          <span className="text-cyan-400 font-mono">{player.category}</span>
                        </div>
                      </div>

                      {/* 3. Payment Status */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Payment Verification
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-emerald-400 font-bold">
                            {player.paymentStatus || 'VERIFIED'}
                          </span>
                        </div>
                        {player.paymentUtr && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">UTR:</span>
                            <span className="text-white font-mono text-[10px]">{player.paymentUtr}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Fee Paid:</span>
                          <span className="text-white font-bold">₹{player.paymentAmount || tourney.registrationFee || 500}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Link to Spectator */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        onClick={() => onOpenSpectatorForTournament(tourney)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition"
                      >
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Watch Live Auction Arena</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY PLAYER PROFILE */}
      {activeTab === 'MY_PROFILE' && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-obsidian-900 border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Player Master Profile</h2>
              <p className="text-xs text-slate-400">
                સેવ કરેલી માહિતીથી તમે કોઈપણ ટૂર્નામેન્ટમાં ૧-સેકન્ડમાં સીધા રજીસ્ટર થઈ શકશો.
              </p>
            </div>
          </div>

          {profileSavedMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Player profile saved successfully! Ready for 1-click tournament participation.</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-obsidian-950 border border-white/20 shrink-0 shadow-lg">
                <img src={profilePhoto} alt="Player Profile" className="w-full h-full object-cover" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Profile Photo (Photo automatically optimized for 2G networks)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={profileMobile}
                  onChange={(e) => setProfileMobile(e.target.value)}
                  placeholder="e.g. +91 98250 12345"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  City / Hometown
                </label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  placeholder="e.g. Surat, Mumbai, Rajkot"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Role
                </label>
                <select
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value as PlayerRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="BATSMAN">Batsman</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="WICKET_KEEPER">Wicket Keeper</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batting Style
                </label>
                <select
                  value={profileBatting}
                  onChange={(e) => setProfileBatting(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Right Hand Batsman">Right Hand Batsman</option>
                  <option value="Left Hand Batsman">Left Hand Batsman</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bowling Style
                </label>
                <select
                  value={profileBowling}
                  onChange={(e) => setProfileBowling(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Right Arm Fast">Right Arm Fast</option>
                  <option value="Right Arm Medium Fast">Right Arm Medium Fast</option>
                  <option value="Right Arm Spin / Leg-Spin">Right Arm Spin</option>
                  <option value="Left Arm Fast">Left Arm Fast</option>
                  <option value="Left Arm Spin">Left Arm Spin</option>
                  <option value="None">None (Only Bat)</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>Save Player Master Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
