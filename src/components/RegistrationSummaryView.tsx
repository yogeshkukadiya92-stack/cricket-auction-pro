import React, { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  Search,
  Share2,
  Copy,
  Check,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Shield,
  Filter,
  X,
  Radio,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Tournament, Player, PlayerRole } from '../types';
import { initialTournaments, initialPlayers } from '../mockData';

interface PublicPlayerInfo {
  id: string;
  name: string;
  photoUrl: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
  city?: string;
  basePrice?: number;
  stats?: {
    matches: number;
    runs: number;
    wickets: number;
    strikeRate: number;
    highestScore?: number;
    bestBowling?: string;
  };
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  status?: string;
  registeredAt?: string;
}

interface PublicTournamentInfo {
  id: string;
  name: string;
  season?: string;
  year?: number;
  logoUrl?: string;
  sponsor?: string;
  ground?: string;
  city?: string;
  registrationFee?: number;
  registrationOpen?: boolean;
  defaultBasePrice?: number;
}

interface RegistrationSummaryViewProps {
  fallbackTournaments?: Tournament[];
  fallbackPlayers?: Player[];
}

export const RegistrationSummaryView: React.FC<RegistrationSummaryViewProps> = ({
  fallbackTournaments = [],
  fallbackPlayers = [],
}) => {
  const [tournament, setTournament] = useState<PublicTournamentInfo | null>(null);
  const [players, setPlayers] = useState<PublicPlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<PublicPlayerInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract tournament ID from URL
  const tournamentId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('tournamentId') || '';
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPublicData = async () => {
      if (!tournamentId) {
        // If no tournament ID in URL, check fallback data
        const fallbackT = fallbackTournaments[0] || initialTournaments[0];
        if (fallbackT) {
          setTournament({
            id: fallbackT.id,
            name: fallbackT.name,
            season: fallbackT.season,
            year: fallbackT.year,
            logoUrl: fallbackT.logoUrl,
            sponsor: fallbackT.sponsor,
            ground: fallbackT.ground,
            city: fallbackT.city,
            registrationFee: fallbackT.registrationFee,
            registrationOpen: fallbackT.registrationOpen !== false,
            defaultBasePrice: fallbackT.defaultBasePrice,
          });
          const matchPlayers = fallbackPlayers.length > 0 ? fallbackPlayers : initialPlayers;
          setPlayers(
            matchPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              photoUrl: p.photoUrl,
              role: p.role,
              battingStyle: p.battingStyle,
              bowlingStyle: p.bowlingStyle,
              city: p.city,
              basePrice: p.basePrice,
              stats: p.stats,
              approvalStatus: p.approvalStatus || 'APPROVED',
              status: p.status,
              registeredAt: p.registeredAt,
            }))
          );
          setLoading(false);
          return;
        }
        setError('Tournament ID is required in link.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/public/tournaments/${encodeURIComponent(tournamentId)}/players-directory`,
          { cache: 'no-store', signal: controller.signal }
        );

        if (response.ok) {
          const resData = await response.json();
          if (isMounted) {
            setTournament(resData.tournament);
            setPlayers(resData.players || []);
            setError('');
            setLoading(false);
          }
          return;
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
      }

      // Offline / LocalStorage / Fallback recovery
      if (isMounted) {
        try {
          let foundTournament: any = null;
          let foundPlayers: any[] = [];

          // 1. Check passed props
          foundTournament = fallbackTournaments.find((t) => t.id === tournamentId);
          if (foundTournament) {
            foundPlayers = fallbackPlayers.filter(
              (p) => !p.tournamentId || p.tournamentId === tournamentId
            );
          }

          // 2. Check localStorage
          if (!foundTournament) {
            const localTournaments = JSON.parse(
              localStorage.getItem('cap_tournaments') || '[]'
            );
            foundTournament = localTournaments.find((t: any) => t.id === tournamentId);
            const localPlayers = JSON.parse(
              localStorage.getItem('cap_players') || '[]'
            );
            foundPlayers = localPlayers.filter(
              (p: any) => !p.tournamentId || p.tournamentId === tournamentId
            );
          }

          // 3. Fallback mock tournaments
          if (!foundTournament) {
            foundTournament = initialTournaments.find((t) => t.id === tournamentId) || initialTournaments[0];
            foundPlayers = initialPlayers;
          }

          if (foundTournament) {
            setTournament({
              id: foundTournament.id,
              name: foundTournament.name,
              season: foundTournament.season,
              year: foundTournament.year,
              logoUrl: foundTournament.logoUrl,
              sponsor: foundTournament.sponsor,
              ground: foundTournament.ground,
              city: foundTournament.city,
              registrationFee: foundTournament.registrationFee,
              registrationOpen: foundTournament.registrationOpen !== false,
              defaultBasePrice: foundTournament.defaultBasePrice,
            });
            setPlayers(
              foundPlayers.map((p) => ({
                id: p.id,
                name: p.name,
                photoUrl: p.photoUrl,
                role: p.role,
                battingStyle: p.battingStyle,
                bowlingStyle: p.bowlingStyle,
                city: p.city,
                basePrice: p.basePrice,
                stats: p.stats,
                approvalStatus: p.approvalStatus || 'APPROVED',
                status: p.status,
                registeredAt: p.registeredAt,
              }))
            );
            setError('');
          } else {
            setError('Tournament details not found.');
          }
        } catch {
          setError('Could not load tournament registrations.');
        } finally {
          setLoading(false);
        }
      }
    };

    void fetchPublicData();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchPublicData();
      }
    }, 12000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [tournamentId, fallbackTournaments, fallbackPlayers]);

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
        (p.role && p.role.toLowerCase().includes(search.toLowerCase()));

      const matchRole =
        selectedRole === 'ALL' ||
        p.role.toUpperCase() === selectedRole.toUpperCase();

      return matchSearch && matchRole;
    });
  }, [players, search, selectedRole]);

  // Statistics counters
  const statsCounts = useMemo(() => {
    const total = players.length;
    const batsmen = players.filter((p) => p.role === 'BATSMAN').length;
    const bowlers = players.filter((p) => p.role === 'BOWLER').length;
    const allRounders = players.filter((p) => p.role === 'ALL_ROUNDER').length;
    const keepers = players.filter((p) => p.role === 'WICKET_KEEPER').length;
    const approved = players.filter((p) => p.approvalStatus === 'APPROVED').length;
    const pending = players.filter((p) => p.approvalStatus === 'PENDING').length;
    return { total, batsmen, bowlers, allRounders, keepers, approved, pending };
  }, [players]);

  const copyShareLink = async () => {
    try {
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set('mode', 'registrations');
      if (tournament?.id) url.searchParams.set('tournamentId', tournament.id);
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('Could not copy link to clipboard');
    }
  };

  const getWhatsAppShareUrl = () => {
    const title = tournament?.name || 'Cricket Tournament';
    const count = players.length;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `🏏 *${title} - Registered Players Directory*\n\n🔥 Total Registrations: *${count} Players*\nCheck the complete player list, photos & stats without login here:\n👉 ${url}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'BATSMAN':
        return { label: 'Batsman', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'BOWLER':
        return { label: 'Bowler', bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'ALL_ROUNDER':
        return { label: 'All-Rounder', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'WICKET_KEEPER':
        return { label: 'Wicket Keeper', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      default:
        return { label: role || 'Player', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <main className="relative min-h-screen bg-obsidian-950 text-white pb-20 selection:bg-gold-500/30 selection:text-gold-200">
      {/* Dynamic ambient background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[45rem] h-[45rem] rounded-full bg-gold-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -left-32 w-[30rem] h-[30rem] rounded-full bg-electric-blue/10 blur-[120px]" />
        <div className="absolute bottom-10 -right-32 w-[28rem] h-[28rem] rounded-full bg-electric-purple/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6 sm:space-y-8">
        {/* Top Header Card */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {tournament?.logoUrl ? (
                <img
                  src={tournament.logoUrl}
                  alt={tournament.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gold-500/40 shadow-glow-gold bg-slate-900 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-3xl sm:text-4xl shadow-glow-gold shrink-0 text-slate-950 font-black">
                  🏏
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    Public Directory • No Login Required
                  </span>
                  {tournament?.season && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10">
                      {tournament.season} {tournament.year || ''}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white break-words">
                  {tournament?.name || 'Tournament Registrations'}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                  {tournament?.ground && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold-400" />
                      {tournament.ground} {tournament.city ? `, ${tournament.city}` : ''}
                    </span>
                  )}
                  {tournament?.sponsor && (
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Sponsored by {tournament.sponsor}
                    </span>
                  )}
                  {tournament?.registrationFee ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      Entry Fee: ₹{tournament.registrationFee.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <button
                type="button"
                onClick={copyShareLink}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
                title="Copy public link that anyone can open without login"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-gold-400" />}
                <span>{copied ? 'Link Copied!' : 'Copy Public Link'}</span>
              </button>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </a>

              {tournament?.registrationOpen !== false && tournament?.id && (
                <a
                  href={`/?mode=register&tournamentId=${encodeURIComponent(tournament.id)}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-slate-950 shadow-glow-gold transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Counter Statistics Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gold-500/15 via-gold-500/5 to-transparent border border-gold-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between text-gold-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Forms</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-3xl font-display font-black text-gold-300">{statsCounts.total}</p>
            <p className="text-[10px] text-slate-400 mt-1">Registered players</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Batsmen</span>
              <span className="text-sm">🏏</span>
            </div>
            <p className="text-3xl font-display font-black text-white">{statsCounts.batsmen}</p>
            <p className="text-[10px] text-slate-400 mt-1">Pure hitters</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-cyan-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Bowlers</span>
              <span className="text-sm">🎯</span>
            </div>
            <p className="text-3xl font-display font-black text-white">{statsCounts.bowlers}</p>
            <p className="text-[10px] text-slate-400 mt-1">Pace & spin</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">All-Rounders</span>
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-3xl font-display font-black text-white">{statsCounts.allRounders}</p>
            <p className="text-[10px] text-slate-400 mt-1">Bat & bowl</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Keepers</span>
              <span className="text-sm">🧤</span>
            </div>
            <p className="text-3xl font-display font-black text-white">{statsCounts.keepers}</p>
            <p className="text-[10px] text-slate-400 mt-1">Wicket keepers</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-display font-black text-emerald-300">{statsCounts.approved}</p>
            <p className="text-[10px] text-slate-400 mt-1">Verified for auction</p>
          </div>
        </section>

        {/* Search & Role Filter Bar */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player name, city, style..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto w-full sm:w-auto scrollbar-none">
              {[
                { id: 'ALL', label: 'All Players', count: statsCounts.total },
                { id: 'BATSMAN', label: 'Batsmen', count: statsCounts.batsmen },
                { id: 'BOWLER', label: 'Bowlers', count: statsCounts.bowlers },
                { id: 'ALL_ROUNDER', label: 'All-Rounders', count: statsCounts.allRounders },
                { id: 'WICKET_KEEPER', label: 'Keepers', count: statsCounts.keepers },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRole(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedRole === tab.id
                      ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950 shadow-md shadow-gold-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedRole === tab.id ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Loading and Error States */}
        {loading && (
          <div className="p-16 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Loading registrations directory…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-2">
            <p className="font-bold">{error}</p>
            <p className="text-xs text-slate-400">Please verify the tournament link or check with the organizer.</p>
          </div>
        )}

        {/* Players Grid */}
        {!loading && filteredPlayers.length === 0 && (
          <div className="p-16 text-center space-y-4 rounded-3xl bg-white/[0.02] border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto grid place-items-center text-3xl">🏏</div>
            <h3 className="text-lg font-bold text-white">No registrations found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `No players matched "${search}". Try searching another name or reset filters.`
                : 'No players have registered for this tournament yet. Be the first to register!'}
            </p>
            {tournament?.registrationOpen !== false && tournament?.id && (
              <a
                href={`/?mode=register&tournamentId=${encodeURIComponent(tournament.id)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gold-500 text-slate-950 hover:bg-gold-400 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register as First Player</span>
              </a>
            )}
          </div>
        )}

        {!loading && filteredPlayers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredPlayers.map((player) => {
              const roleMeta = getRoleBadge(player.role);
              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="group relative rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent border border-white/10 hover:border-gold-500/40 p-4 transition-all duration-300 hover:shadow-2xl hover:shadow-gold-500/10 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top glow on card hover */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-16 bg-gold-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Player Photo with full visibility framing */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950/80 border border-white/5 mb-3.5">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-4xl bg-slate-900 text-slate-600">
                        🏏
                      </div>
                    )}

                    {/* Gradient overlay for bottom badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Role Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm ${roleMeta.bg}`}
                      >
                        {roleMeta.label}
                      </span>
                    </div>

                    {/* Approval Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {player.approvalStatus === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 backdrop-blur-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300 backdrop-blur-md">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Registered
                        </span>
                      )}
                    </div>

                    {/* City Tag on photo */}
                    {player.city && (
                      <div className="absolute bottom-2 left-2.5 text-[10px] font-semibold text-slate-300 flex items-center gap-1 drop-shadow-md">
                        <MapPin className="w-3 h-3 text-gold-400" />
                        <span>{player.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Player Name & Style */}
                  <div className="space-y-1 mb-3">
                    <h3 className="text-base font-display font-bold text-white group-hover:text-gold-300 transition-colors line-clamp-1">
                      {player.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {player.battingStyle || 'Right Hand'} • {player.bowlingStyle || 'Right Arm'}
                    </p>
                  </div>

                  {/* Cricket Statistics Pills */}
                  <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center mb-3">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-500">M</span>
                      <span className="block text-xs font-black text-white">{player.stats?.matches || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-500">Runs</span>
                      <span className="block text-xs font-black text-amber-400">{player.stats?.runs || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-500">Wkt</span>
                      <span className="block text-xs font-black text-cyan-400">{player.stats?.wickets || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-500">SR</span>
                      <span className="block text-xs font-black text-emerald-400">
                        {player.stats?.strikeRate || 0}
                      </span>
                    </div>
                  </div>

                  {/* Footer Card action */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Base Price: <strong className="text-white">₹{(player.basePrice || tournament?.defaultBasePrice || 20000).toLocaleString()}</strong>
                    </span>
                    <span className="text-gold-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-[11px]">
                      View Profile <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA for unregistered players */}
        {tournament?.registrationOpen !== false && tournament?.id && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-gold-500/5 to-cyan-500/10 border border-gold-500/20 text-center space-y-3">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white">
              Want to participate in {tournament.name}?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Self-registration is currently active. Submit your cricket statistics, batting & bowling styles, and high-res photo in 60 seconds!
            </p>
            <a
              href={`/?mode=register&tournamentId=${encodeURIComponent(tournament.id)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-slate-950 shadow-glow-gold transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fill Player Registration Form</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-6 sm:p-7 text-white space-y-5 overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 grid place-items-center text-xl text-gold-400 font-black">
                  🏏
                </span>
                <div>
                  <h3 className="text-xl font-display font-black text-white">{selectedPlayer.name}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedPlayer.city ? `${selectedPlayer.city} • ` : ''}
                    {getRoleBadge(selectedPlayer.role).label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo & Styles */}
            <div className="flex flex-col sm:flex-row gap-5 items-center">
              <div className="w-36 h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg shrink-0">
                {selectedPlayer.photoUrl ? (
                  <img
                    src={selectedPlayer.photoUrl}
                    alt={selectedPlayer.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-4xl bg-slate-900 text-slate-600">
                    🏏
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Batting Style</span>
                  <p className="text-xs font-bold text-white">{selectedPlayer.battingStyle || 'Right Hand'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Bowling Style</span>
                  <p className="text-xs font-bold text-white">{selectedPlayer.bowlingStyle || 'Right Arm Fast'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Base Price</span>
                  <p className="text-xs font-black text-gold-300">
                    ₹{(selectedPlayer.basePrice || tournament?.defaultBasePrice || 20000).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Cricket Stats Matrix */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Verified Cricket Career Stats
              </h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Matches</span>
                  <span className="text-base font-black text-white">{selectedPlayer.stats?.matches || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Runs</span>
                  <span className="text-base font-black text-amber-400">{selectedPlayer.stats?.runs || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Wickets</span>
                  <span className="text-base font-black text-cyan-400">{selectedPlayer.stats?.wickets || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Strike Rate</span>
                  <span className="text-base font-black text-emerald-400">
                    {selectedPlayer.stats?.strikeRate || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
