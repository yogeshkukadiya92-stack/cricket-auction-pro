import { OrganizerProfileView } from './components/OrganizerProfileView';
import { OrganizerMobileNav } from './components/OrganizerMobileNav';
import { RegistrationSummaryView } from './components/RegistrationSummaryView';
import React, { useState, useEffect, useRef } from 'react';
import {
  initialTournament,
  initialRules,
} from './mockData';
import {
  Tournament,
  AuctionRules,
  Team,
  Player,
  BidRecord,
  ViewMode,
  User,
  AppPortal,
} from './types';
import { Navbar } from './components/Navbar';
import { TournamentDashboardView } from './components/TournamentDashboardView';
import { TournamentsListView } from './components/TournamentsListView';
import { UserPortalView } from './components/UserPortalView';
import { TournamentModal } from './components/TournamentModal';
import { StageView } from './components/StageView';
import { AuctioneerConsole } from './components/AuctioneerConsole';
import { TeamPaddleView } from './components/TeamPaddleView';
import { PlayerManagerView } from './components/PlayerManagerView';
import { TeamsManagerView } from './components/TeamsManagerView';
import { RulesSettingsView } from './components/RulesSettingsView';
import { SquadSummaryView } from './components/SquadSummaryView';
import { ObsOverlayView } from './components/ObsOverlayView';
import { SoldPosterModal } from './components/SoldPosterModal';
import { RegistrationFormBuilder } from './components/RegistrationFormBuilder';
import { PublicRegistrationView } from './components/PublicRegistrationView';
import { AuthModal } from './components/AuthModal';
import { AdminPanelView } from './components/AdminPanelView';
import { FortuneWheelModal } from './components/FortuneWheelModal';
import { BulkPlayerUploadModal } from './components/BulkPlayerUploadModal';
import { PublicSpectatorView } from './components/PublicSpectatorView';
import { syncEngine, SyncAction } from './utils/syncEngine';
import { dbService } from './services/dbService';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { ArrowLeft } from 'lucide-react';
import { PlayerApp } from './components/player/PlayerApp';
import { LandingScreen } from './components/LandingScreen';
import { DeviceSimulatorView } from './components/DeviceSimulatorView';

const PLAYER_ROLE_KEY = 'cap_app_role';
/** Player area opens via ?mode=player, or automatically for someone who last used it on this device. */
const startsInPlayerMode = () => {
  if (typeof window === 'undefined') return false;
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'player') return true;
  try { return !mode && localStorage.getItem(PLAYER_ROLE_KEY) === 'player'; } catch { return false; }
};

export function App() {
  const settling = useRef(false);
  const seenAuctionEvent = useRef('');
  const serverTournaments = useRef('');
  const serverTeams = useRef('');
  const serverPlayers = useRef('');
  const [saveMessage, setSaveMessage] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [loadedLiveTournamentId, setLoadedLiveTournamentId] = useState('');
  const [dataError, setDataError] = useState('');
  const [publicTournament, setPublicTournament] = useState<Tournament | null>(null);
  const [publicSummary, setPublicSummary] = useState<{ tournament: Tournament; teams: Team[]; players: Player[]; registrationPlayers?: Player[]; registrationStats?: { total: number; pending: number; approved: number; rejected: number } } | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(() => !!(localStorage.getItem('cap_tournaments') || localStorage.getItem('cap_tournament')));
  // Database status modal state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'ADMIN_LOGIN'>('LOGIN');

  // Two-Portal Platform Architecture: 'ORGANIZER' vs 'USER'
  const [activePortal, setActivePortal] = useState<AppPortal>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get('portal');
      if (portalParam === 'user' || portalParam === 'player') return 'USER';
      if (portalParam === 'organizer' || portalParam === 'admin') return 'ORGANIZER';
      if (params.get('mode') === 'user' || params.get('mode') === 'portal') return 'USER';
    }
    const savedPortal = localStorage.getItem('cap_active_portal');
    if (savedPortal === 'USER' || savedPortal === 'ORGANIZER') return savedPortal;
    const savedUser = localStorage.getItem('cap_current_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role === 'USER') return 'USER';
      } catch {}
    }
    return 'ORGANIZER';
  });

  useEffect(() => {
    localStorage.setItem('cap_active_portal', activePortal);
  }, [activePortal]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (user.role === 'ADMIN') {
      setActivePortal('ORGANIZER');
      setViewMode('ADMIN_PANEL');
    } else if (user.role === 'USER') {
      setActivePortal('USER');
      setViewMode('USER_PORTAL');
    } else {
      setActivePortal('ORGANIZER');
      setViewMode('TOURNAMENT_OVERVIEW');
    }
  };

  const handleLogout = async () => {
    try { await dbService.flushSync(); } catch { setSaveMessage('Save your pending changes before signing out.'); return; }
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok && response.status !== 401) throw new Error('Sign out failed');
    } catch { setSaveMessage('Could not sign out. Check your connection and retry.'); return; }
    dbService.clearPending();
    setDataReady(false);
    setLiveReady(false);
    setLoadedLiveTournamentId('');
    setCurrentUser(null);
    setTournaments([]);
    setTeams([]);
    setPlayers([]);
    if (activePortal === 'USER') {
      setViewMode('USER_PORTAL');
    } else {
      setViewMode('TOURNAMENTS');
    }
  };

  // Multiple Tournaments state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [activeTournamentId, setActiveTournamentId] = useState<string>('');

  const tournament =
    tournaments.find((t) => t.id === activeTournamentId) ||
    tournaments[0] ||
    { id: '', name: 'My Tournaments', year: new Date().getFullYear(), season: '', defaultBasePrice: 20000, status: 'UPCOMING' as const };

  // Filter tournaments visible to current user (organizer vs super admin)
  const visibleTournaments = tournaments.filter((t) => {
    return !!currentUser && (currentUser.role === 'ADMIN' || t.userId === currentUser.id);
  });

  // Tournament Create / Edit Modal State
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournamentData, setEditingTournamentData] = useState<Tournament | null>(null);

  const [rules, setRules] = useState<AuctionRules>(initialRules);

  const [teams, setTeams] = useState<Team[]>([]);

  const [players, setPlayers] = useState<Player[]>([]);

  // Check URL params (?mode=obs for OBS, ?mode=register for public player form, ?mode=summary for live spectators)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      if (startsInPlayerMode()) return 'PLAYER';
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'registrations') return 'PUBLIC_REGISTRATIONS';
      if (params.get('mode') === 'obs') return 'OBS';
      if (params.get('mode') === 'register' || params.get('mode') === 'form') {
        return 'PUBLIC_REGISTER';
      }
      if (params.get('mode') === 'summary' || params.get('mode') === 'live' || params.get('mode') === 'spectator') {
        return 'PUBLIC_SUMMARY';
      }
      if (params.get('mode') === 'simulator' || params.get('mode') === 'device') {
        return 'SIMULATOR';
      }
      if (params.get('mode') === 'players' && params.has('tournamentId') && !document.cookie.includes('__Host-cap_session')) {
        return 'PUBLIC_REGISTRATIONS';
      }
    }
    return 'TOURNAMENT_OVERVIEW';
  });

  const selectViewMode = (mode: ViewMode) => {
    if (!tournament.id && !['TOURNAMENTS', 'ADMIN_PANEL', 'ORGANIZER_PROFILE'].includes(mode)) { setViewMode('TOURNAMENTS'); return; }
    if (mode === 'ADMIN_PANEL' && currentUser?.role !== 'ADMIN') return;
    if (mode === 'OBS') {
      window.open(`/?mode=obs&tournamentId=${encodeURIComponent(tournament.id)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.history.replaceState({ ...window.history.state, capOrganizerMode: viewMode }, '');
    window.history.pushState({ capOrganizerMode: mode }, '');
    setViewMode(mode);
  };

  useEffect(() => {
    const onBack = (event: PopStateEvent) => {
      if (event.state?.capOrganizerMode) setViewMode(event.state.capOrganizerMode);
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const registrationPreviewReturn = useRef<ViewMode | null>(null);
  const openRegistrationPreview = () => {
    registrationPreviewReturn.current = viewMode;
    window.history.pushState({ ...window.history.state, capRegistrationPreview: true }, '');
    setViewMode('PUBLIC_REGISTER');
  };
  const leaveRegistration = () => {
    if (registrationPreviewReturn.current) {
      window.history.back();
      return;
    }
    // Shared links can open in a fresh tab with no previous app page.
    window.location.assign(window.location.pathname);
  };
  useEffect(() => {
    const restorePreview = () => {
      if (registrationPreviewReturn.current) {
        const previous = registrationPreviewReturn.current;
        registrationPreviewReturn.current = null;
        setViewMode(previous);
      } else if (window.history.state?.capRegistrationPreview) {
        registrationPreviewReturn.current = 'FORM_BUILDER';
        setViewMode('PUBLIC_REGISTER');
      }
    };
    window.addEventListener('popstate', restorePreview);
    return () => window.removeEventListener('popstate', restorePreview);
  }, []);

  // Additional Feature Modals (Fortune Wheel, Excel Bulk Upload)
  const [isFortuneWheelOpen, setIsFortuneWheelOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  // Live Auction State
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [leadingTeam, setLeadingTeam] = useState<Team | null>(null);
  const [bidsHistory, setBidsHistory] = useState<BidRecord[]>([]);

  // Overlays
  const [isSold, setIsSold] = useState(false);
  const [isUnsold, setIsUnsold] = useState(false);
  const [lastSoldInfo, setLastSoldInfo] = useState<{ player: Player; team: Team; price: number } | null>(null);

  // Social Poster Modal State
  const [posterData, setPosterData] = useState<{ player: Player; team: Team; price: number } | null>(null);

  useEffect(() => {
    return dbService.subscribe(setSaveMessage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'simulator' || params.get('mode') === 'device') { setAuthChecked(true); return; }
    if (params.has('tournamentId') && ['obs', 'register', 'form', 'summary', 'live', 'spectator', 'registrations'].includes(params.get('mode') || '')) { setAuthChecked(true); return; }
    if (params.has('tournamentId') && params.get('mode') === 'players' && !document.cookie.includes('__Host-cap_session')) { setAuthChecked(true); return; }
    if (startsInPlayerMode()) { setAuthChecked(true); return; }
    fetch('/api/auth/me').then(async (res) => {
      if (!res.ok) return null;
      return (await res.json()).user as User;
    }).then(setCurrentUser).catch(() => setCurrentUser(null)).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_REGISTER') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) { if (currentUser && tournament.id) setPublicTournament(tournament); else setDataError('Tournament link is missing its ID.'); return; }
    fetch(`/api/public/tournaments/${encodeURIComponent(id)}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tournament unavailable');
      setPublicTournament(data.tournament);
    }).catch((err) => setDataError(err.message));
  }, [viewMode, currentUser?.id, tournament]);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_SUMMARY' && viewMode !== 'OBS') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/public/tournaments/${encodeURIComponent(id)}/summary`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Tournament unavailable');
        if (!cancelled) { consumeAuctionEvent(data.liveState?.lastEvent); setPublicSummary(data); setDataError(''); }
      } catch (err) { if (!cancelled) setDataError((err as Error).message); }
    };
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [viewMode]);

  // Load only the signed-in organizer's records from the server.
  useEffect(() => {
    if (!currentUser || ['PUBLIC_REGISTER', 'PUBLIC_SUMMARY', 'PUBLIC_REGISTRATIONS', 'OBS'].includes(viewMode) && new URLSearchParams(window.location.search).has('tournamentId')) return;
    setDataReady(false);
    dbService.setScope(currentUser.id);
    dbService.flushSync().then(() => dbService.fetchBootstrapData()).then((data) => {
      if (!data?.success) throw new Error('Could not load your tournaments');
      serverTournaments.current = JSON.stringify(data.tournaments || []);
      setTournaments(data.tournaments || []);
      serverTeams.current = JSON.stringify(data.teams || []);
      serverPlayers.current = JSON.stringify(data.players || []);
      setTeams(data.teams || []);
      setPlayers(data.players || []);
      setRules(data.tournaments?.[0]?.rules || data.rules || initialRules);
      const requestedId = new URLSearchParams(window.location.search).get('tournamentId');
      const requested = data.tournaments?.find(t => t.id === requestedId);
      setActiveTournamentId(requested?.id || data.tournaments?.[0]?.id || '');
      if (requested) setRules(requested.rules || initialRules);
      if (new URLSearchParams(window.location.search).get('mode') !== 'summary') {
        if (new URLSearchParams(window.location.search).get('mode') === 'players' && requested) setViewMode('PLAYERS');
        else setViewMode(currentUser.role === 'ADMIN' ? 'ADMIN_PANEL' : 'TOURNAMENTS');
      }
      setDataReady(true);
    }).catch((err) => setDataError(err.message));
  }, [currentUser?.id]);

  // Persist changes only after the organizer's server data has loaded.
  useEffect(() => {
    const value = JSON.stringify(tournaments);
    if (dataReady && value !== serverTournaments.current) { serverTournaments.current = value; dbService.queueSync({ tournaments }); }
  }, [tournaments, dataReady, currentUser?.role]);

  useEffect(() => {
    if (activeTournamentId) syncEngine.setScope(activeTournamentId);
  }, [activeTournamentId]);

  useEffect(() => {
    if (!dataReady || !activeTournamentId) return;
    setLiveReady(false);
    setLoadedLiveTournamentId('');
    let cancelled = false;
    dbService.flushSync().then(() => fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/live`)).then(async res => {
      if (!res.ok) throw new Error('Could not load live auction');
      return (await res.json()).liveState;
    }).then(state => {
      if (cancelled) return;
      setCurrentPlayerId(state.currentPlayerId || '');
      setCurrentBid(state.currentBid || 0);
      setLeadingTeam(state.leadingTeam || null);
      setBidsHistory(state.bidsHistory || []);
      setLoadedLiveTournamentId(activeTournamentId);
      setLiveReady(true);
    }).catch(err => { if (!cancelled) setDataError(err.message); });
    return () => { cancelled = true; };
  }, [activeTournamentId, dataReady]);



  useEffect(() => {
    const value = JSON.stringify(teams);
    if (dataReady && value !== serverTeams.current) { serverTeams.current = value; dbService.queueSync({ teams }); }
  }, [teams, dataReady]);

  useEffect(() => {
    const value = JSON.stringify(players);
    if (dataReady && value !== serverPlayers.current) { serverPlayers.current = value; dbService.queueSync({ players }); }
  }, [players, dataReady]);


  // Real-Time Cross-Device & Cross-Tab Synchronization
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((action: SyncAction) => {
      switch (action.type) {
        case 'BID_PLACED':
          setCurrentBid(action.payload.amount);
          setLeadingTeam(action.payload.team);
          setBidsHistory((prev) => prev.some(b => b.id === action.payload.record.id) ? prev : [action.payload.record, ...prev]);
          break;
        case 'HAMMER_SOLD':
          setLastSoldInfo({
            player: action.payload.player,
            team: action.payload.team,
            price: action.payload.price,
          });
          setIsSold(true);
          setTimeout(() => setIsSold(false), 3800);
          break;
        case 'MARK_UNSOLD':
          setIsUnsold(true);
          setTimeout(() => setIsUnsold(false), 2800);
          break;
        case 'UNDO_BID':
          setBidsHistory(prev => prev.slice(1));
          if (action.payload.prevBid) {
            setCurrentBid(action.payload.prevBid.amount);
            const t = teams.find((item) => item.id === action.payload.prevBid?.teamId) || null;
            setLeadingTeam(t);
          } else {
            setCurrentBid(0);
            setLeadingTeam(null);
          }
          break;
        case 'SELECT_PLAYER':
          setCurrentPlayerId(action.payload.player.id);
          setCurrentBid(0);
          setLeadingTeam(null);
          setBidsHistory([]);
          break;
        case 'PLAYER_REGISTERED':
          setPlayers((prev) => {
            if (prev.some((p) => p.id === action.payload.player.id)) return prev;
            return [action.payload.player, ...prev];
          });
          break;
        case 'PLAYER_APPROVED':
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === action.payload.playerId
                ? { ...p, approvalStatus: 'APPROVED' }
                : p
            )
          );
          break;
        case 'PLAYER_REJECTED':
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === action.payload.playerId ? { ...p, approvalStatus: 'REJECTED' } : p
            )
          );
          break;
        case 'TOURNAMENT_CREATED':
          setTournaments((prev) => {
            if (prev.some((t) => t.id === action.payload.tournament.id)) return prev;
            return [action.payload.tournament, ...prev];
          });
          break;
        case 'TOURNAMENT_UPDATED':
          setTournaments((prev) =>
            prev.map((t) => (t.id === action.payload.tournament.id ? action.payload.tournament : t))
          );
          break;
        case 'TOURNAMENT_SELECTED':
          setActiveTournamentId(action.payload.tournamentId);
          break;
        case 'PLAYERS_UPDATED':
          setPlayers(action.payload.players);
          break;
        case 'CLEAR_ALL_DATA':
          setPlayers([]);
          setTeams((prev) =>
            prev.map((t) => ({ ...t, remainingPurse: t.totalPurse }))
          );
          setCurrentPlayerId('');
          setCurrentBid(0);
          setLeadingTeam(null);
          setBidsHistory([]);
          break;
        case 'RESET_AUCTION':
          handleResetAuction();
          break;
      }
    });
    return () => unsubscribe();
  }, [teams]);

  // Scoped Data for the currently active tournament
  const activeTeams = teams.filter((t) => !t.tournamentId || t.tournamentId === tournament.id);
  const activePlayers = players.filter((p) => !p.tournamentId || p.tournamentId === tournament.id);

  const currentPlayer = activePlayers.find((p) => p.id === currentPlayerId) || null;

  const consumeAuctionEvent = (event: any) => {
    if (!event || event.id === seenAuctionEvent.current) return;
    seenAuctionEvent.current = event.id;
    const elapsed = Date.now() - event.timestamp;
    if (elapsed > 3800) return;
    if (event.type === 'SOLD' && event.player && event.team) {
      setLastSoldInfo({ player: event.player, team: event.team, price: event.price });
      setIsSold(true);
      setTimeout(() => { setIsSold(false); setLastSoldInfo(null); }, Math.max(0, 3800 - elapsed));
    } else if (event.type === 'UNSOLD' && elapsed < 2800) {
      setIsUnsold(true); setTimeout(() => setIsUnsold(false), Math.max(0, 2800 - elapsed));
    }
  };

  const applyAuctionSnapshot = (data: any, id: string) => {
    const state = data.liveState || {};
    consumeAuctionEvent(state.lastEvent);
    setCurrentPlayerId(state.currentPlayerId || '');
    setCurrentBid(state.currentBid || 0);
    setLeadingTeam(state.leadingTeam || null);
    setBidsHistory(state.bidsHistory || []);
    if (data.teams) setTeams(prev => { const next = [...prev.filter(t => t.tournamentId !== id), ...data.teams]; serverTeams.current = JSON.stringify(next); return next; });
    if (data.players) setPlayers(prev => { const next = [...prev.filter(p => p.tournamentId !== id), ...data.players]; serverPlayers.current = JSON.stringify(next); return next; });
  };

  const runAuctionCommand = async (action: string, extra: Record<string, unknown> = {}) => {
    if (settling.current || !liveReady) return;
    settling.current = true;
    const id = activeTournamentId;
    try {
      await dbService.flushSync();
      const response = await fetch(`/api/tournaments/${encodeURIComponent(id)}/auction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, playerId: currentPlayerId, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Auction action failed');
      applyAuctionSnapshot(data, id);
      setSaveMessage('');
    } catch (error) { setSaveMessage((error as Error).message); }
    finally { settling.current = false; }
  };
  const handlePlaceBid = (team: Team, amount: number) => { void runAuctionCommand('BID', { teamId: team.id, amount }); };
  const handleSold = () => { void runAuctionCommand('SOLD', { teamId: leadingTeam?.id, amount: currentBid }); };
  const handleUnsold = () => { void runAuctionCommand('UNSOLD'); };
  const handleUndoBid = () => { void runAuctionCommand('UNDO'); };
  const handleSelectPlayer = (player: Player) => { void runAuctionCommand('SELECT', { playerId: player.id }); };

  // Display and paddle clients read the same authoritative auction state.
  useEffect(() => {
    if (!dataReady || !activeTournamentId || !['STAGE', 'AUCTIONEER', 'PADDLE', 'OBS', 'PUBLIC_SUMMARY', 'PLAYERS', 'TOURNAMENT_OVERVIEW'].includes(viewMode)) return;
    let cancelled = false;
    const refresh = async () => {
      if (settling.current || dbService.hasPending()) return;
      try {
        const response = await fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/snapshot`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && !settling.current && !dbService.hasPending()) applyAuctionSnapshot(data, activeTournamentId);
      } catch { /* Existing data stays visible until the next successful refresh. */ }
    };
    const timer = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [viewMode, dataReady, activeTournamentId]);

  // Random Draw
  const handleRandomDraw = () => {
    const unAuctioned = activePlayers.filter(
      (p) => (!p.approvalStatus || p.approvalStatus === 'APPROVED') && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION')
    );
    if (unAuctioned.length === 0) {
      alert('All players in this tournament pool have been auctioned! Check the Squad Booklet.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * unAuctioned.length);
    handleSelectPlayer(unAuctioned[randomIndex]);
  };

  // Reset Auction for current tournament
  const handleResetAuction = () => { void runAuctionCommand('RESET'); };

  // Tournament Management Handlers
  const handleCreateTournament = (data: Partial<Tournament>) => {
    const newTourney: Tournament = {
      id: `tourney-${Date.now()}`,
      userId: currentUser?.id,
      creatorEmail: currentUser?.email,
      name: data.name || 'New Tournament',
      season: data.season || 'Season 1',
      year: data.year || 2026,
      status: data.status || 'UPCOMING',
      logoUrl: data.logoUrl || '🏆',
      sponsor: data.sponsor || '',
      coSponsors: data.coSponsors || '',
      defaultBasePrice: data.defaultBasePrice || 20000,
      totalPursePerTeam: data.totalPursePerTeam || 1000000,
      expectedTeamsCount: data.expectedTeamsCount || 8,
      ground: data.ground || '',
      city: data.city || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      ballType: data.ballType || 'Heavy Tennis Ball',
      registrationOpen: data.registrationOpen ?? true,
      registrationFee: data.registrationFee ?? 0,
      registrationDeadline: data.registrationDeadline || '',
      upiId: data.upiId || '',
      gpayNumber: data.gpayNumber || '',
      gpayName: data.gpayName || '',
      paymentMandatory: data.paymentMandatory ?? false,
      rules: { ...initialRules, ...data.rules, pursePerTeam: data.totalPursePerTeam || initialRules.pursePerTeam },
      customFields: data.customFields || [],
      sportType: data.sportType || 'CRICKET',
      instructions: data.instructions || '',
      gpayQrUrl: data.gpayQrUrl || '',
    };

    setRules(newTourney.rules || initialRules);
    dbService.queueSync({ tournament: newTourney });
    setTournaments((prev) => [newTourney, ...prev]);
    setActiveTournamentId(newTourney.id);
    setViewMode('TOURNAMENT_OVERVIEW');

    syncEngine.broadcast({
      type: 'TOURNAMENT_CREATED',
      payload: { tournament: newTourney },
    });
  };

  const handleUpdateTournament = (updated: Tournament) => {
    if (updated.id === activeTournamentId && updated.rules) setRules(updated.rules);
    dbService.queueSync({ tournament: updated, ...(updated.rules ? { rules: updated.rules, tournamentId: updated.id } : {}) });
    setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    syncEngine.broadcast({
      type: 'TOURNAMENT_UPDATED',
      payload: { tournament: updated },
    });
  };

  const deleteRecord = async (route: string, id: string, apply: () => void) => {
    try {
      await dbService.flushSync();
      const response = await fetch(`/api/${route}/${encodeURIComponent(id)}?tournamentId=${encodeURIComponent(activeTournamentId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Delete failed');
      apply();
    } catch (error) { setSaveMessage((error as Error).message); }
  };
  const handleDeleteTournament = (id: string) => {
    void deleteRecord('tournaments', id, () => {
      const remaining = tournaments.filter(t => t.id !== id);
      setTournaments(remaining);
      setTeams(prev => prev.filter(t => t.tournamentId !== id));
      setPlayers(prev => prev.filter(p => p.tournamentId !== id));
      if (activeTournamentId === id) setActiveTournamentId(remaining[0]?.id || '');
      setViewMode('TOURNAMENTS');
    });
  };

  const handleSelectTournament = async (tourneyId: string) => {
    try { await dbService.flushSync(); } catch { setSaveMessage('Save pending changes before switching tournaments.'); return; }
    setRules(tournaments.find(t => t.id === tourneyId)?.rules || initialRules);
    setActiveTournamentId(tourneyId);
    setViewMode('TOURNAMENT_OVERVIEW');
    syncEngine.broadcast({
      type: 'TOURNAMENT_SELECTED',
      payload: { tournamentId: tourneyId },
    });
  };

  // Team Management Handlers
  const handleAddTeam = (newTeam: Team) => {
    const teamWithTourney: Team = {
      ...newTeam,
      tournamentId: newTeam.tournamentId || tournament.id,
    };
    dbService.queueSync({ team: teamWithTourney });
    setTeams((prev) => [...prev, teamWithTourney]);
  };

  const handleUpdateTeam = (updated: Team) => {
    dbService.queueSync({ team: updated });
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTeam = (teamId: string) => {
    if (players.some(p => p.soldToTeamId === teamId)) { setSaveMessage('Reset the auction before deleting a team with sold players.'); return; }
    void deleteRecord('teams', teamId, () => setTeams(prev => prev.filter(t => t.id !== teamId)));
  };

  // Player Management Handlers
  const handleAddPlayer = (newPlayer: Player) => {
    const playerWithTourney: Player = {
      ...newPlayer,
      tournamentId: tournament.id,
    };
    dbService.queueSync({ player: playerWithTourney });
    setPlayers((prev) => [...prev, playerWithTourney]);
  };

  const handleBulkAddPlayers = (newPlayers: Player[]) => {
    const lastLot = Math.max(0, ...activePlayers.map(p => p.lotOrder || 0));
    const mapped = newPlayers.map((p, index) => ({
      ...p,
      tournamentId: tournament.id,
      lotOrder: lastLot + index + 1,
    }));
    dbService.queueSync({ players: mapped });
    setPlayers((prev) => [...prev, ...mapped]);
  };

  const handleLaunchAcceleratedRound = (discountPercent: number) => { void runAuctionCommand('ACCELERATE', { discountPercent }); };

  const handlePlayerCorrection = async (action: string, playerId: string, teamId?: string, amount?: number) => {
    await dbService.flushSync();
    const response = await fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/player-correction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, playerId, teamId, amount }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Correction failed');
    const snapshot = await fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/snapshot`, { cache: 'no-store' });
    if (!snapshot.ok) throw new Error('Saved, but refresh failed. Reload the page.');
    applyAuctionSnapshot(await snapshot.json(), activeTournamentId);
  };
  const handleDeletePlayer = (playerId: string) => { void handlePlayerCorrection('DELETE', playerId).catch(error => setSaveMessage(error.message)); };

  const handleApprovePlayer = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, approvalStatus: 'APPROVED' }
          : p
      )
    );
    syncEngine.broadcast({
      type: 'PLAYER_APPROVED',
      payload: { playerId },
    });
    alert('✅ Player approved and added to the official auction lot!');
  };

  const handleRejectPlayer = (playerId: string) => {
    if (confirm('Are you sure you want to reject this registration?')) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, approvalStatus: 'REJECTED' } : p
        )
      );
      syncEngine.broadcast({
        type: 'PLAYER_REJECTED',
        payload: { playerId },
      });
    }
  };

  const handleRegisterPlayer = async (newPlayer: Player): Promise<Player> => {
    if (!publicTournament) throw new Error('Tournament is unavailable');
    const response = await fetch(`/api/public/tournaments/${encodeURIComponent(publicTournament.id)}/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: newPlayer }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data.player;
  };

  const importBrowserData = () => {
    if (!currentUser) return;
    try {
      const saved = JSON.parse(localStorage.getItem('cap_tournaments') || 'null');
      const single = JSON.parse(localStorage.getItem('cap_tournament') || 'null');
      const oldTournaments: Tournament[] = Array.isArray(saved) && saved.length ? saved : single ? [single] : [];
      if (!oldTournaments.length) throw new Error('No browser tournaments found');
      const owned = oldTournaments.map(t => ({ ...t, userId: currentUser.id, creatorEmail: currentUser.email }));
      const firstId = owned[0].id;
      const oldTeams = JSON.parse(localStorage.getItem('cap_teams') || '[]');
      const oldPlayers = JSON.parse(localStorage.getItem('cap_players') || '[]');
      setTournaments(owned);
      setTeams((Array.isArray(oldTeams) ? oldTeams : []).map((t: Team) => ({ ...t, tournamentId: t.tournamentId || firstId })));
      setPlayers((Array.isArray(oldPlayers) ? oldPlayers : []).map((p: Player) => ({ ...p, tournamentId: p.tournamentId || firstId })));
      setActiveTournamentId(firstId);
      setLegacyAvailable(false);
    } catch (error) { alert((error as Error).message); }
  };

  const enterPlayerMode = () => {
    try { localStorage.setItem(PLAYER_ROLE_KEY, 'player'); } catch { /* private mode */ }
    window.history.replaceState(null, '', '/?mode=player');
    setViewMode('PLAYER');
  };
  const exitPlayerMode = () => {
    try { localStorage.removeItem(PLAYER_ROLE_KEY); } catch { /* private mode */ }
    // Full reload so the organizer session (if any) is checked and loaded fresh.
    window.location.replace('/');
  };

  if (viewMode === 'PLAYER') return <PlayerApp onExit={exitPlayerMode} />;

  if (viewMode === 'PUBLIC_REGISTRATIONS') return <RegistrationSummaryView fallbackTournaments={tournaments} fallbackPlayers={players} />;

  if (viewMode === 'SIMULATOR') {
    return (
      <DeviceSimulatorView
        tournament={tournament}
        onClose={() => setViewMode('TOURNAMENT_OVERVIEW')}
      />
    );
  }

  // Dedicated clean view for public player registration (?mode=register)
  if (viewMode === 'PUBLIC_REGISTER') {
    if (!publicTournament) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">{dataError || 'Loading tournament…'}</main>;
    return (
      <PublicRegistrationView
        tournament={publicTournament}
        onBack={leaveRegistration}
        onRegisterPlayer={handleRegisterPlayer}
      />
    );
  }

  if (viewMode === 'PUBLIC_SUMMARY' && new URLSearchParams(window.location.search).has('tournamentId')) {
    if (!publicSummary) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">{dataError || 'Loading tournament…'}</main>;
    return <><div role="status" className="bg-slate-950 text-amber-300 text-center">{dataError}</div><PublicSpectatorView tournament={publicSummary.tournament} teams={publicSummary.teams} players={publicSummary.players} registrationStats={publicSummary.registrationStats} registrationPlayers={publicSummary.registrationPlayers} currentPlayer={publicSummary.players.find(p => p.id === (publicSummary as any).liveState?.currentPlayerId)} currentBid={(publicSummary as any).liveState?.currentBid} leadingTeam={publicSummary.teams.find(t => t.id === (publicSummary as any).liveState?.leadingTeam?.id)} bidsHistory={(publicSummary as any).liveState?.bidsHistory || []} /></>;
  }
  if (viewMode === 'OBS' && new URLSearchParams(window.location.search).has('tournamentId')) {
    if (!publicSummary) return <main>{dataError || 'Loading auction…'}</main>;
    const state = (publicSummary as any).liveState || {};
    return <ObsOverlayView timerSeconds={publicSummary.tournament.rules?.timerSeconds} currency={publicSummary.tournament.rules?.currency} currentPlayer={publicSummary.players.find(p => p.id === state.currentPlayerId) || null} currentBid={state.currentBid || 0} leadingTeam={publicSummary.teams.find(t => t.id === state.leadingTeam?.id) || null} bidsHistory={[]} isSold={isSold} isUnsold={isUnsold} lastSoldInfo={lastSoldInfo} />;
  }
  if (!authChecked) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">Loading…</main>;
  if (!currentUser) return <LandingScreen onPlayer={enterPlayerMode} onOrganizer={() => { setAuthInitialMode('LOGIN'); setIsAuthModalOpen(true); }} onAdmin={() => { setAuthInitialMode('ADMIN_LOGIN'); setIsAuthModalOpen(true); }}><AuthModal initialMode={authInitialMode} isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleLoginSuccess} /></LandingScreen>;
  if (!dataReady) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center"><div>{dataError || 'Loading your tournaments…'}{dataError && <button onClick={() => window.location.reload()} className="ml-4 underline">Retry</button>}</div></main>;

  if (currentUser.role === 'ADMIN' && viewMode === 'ADMIN_PANEL') return <div className="pb-24 lg:pb-0"><div className="bg-slate-950 px-4 py-2 text-right"><button onClick={() => selectViewMode('ORGANIZER_PROFILE')} className="text-sm font-bold text-amber-400 min-h-11">My Profile</button></div><AdminPanelView
    currentUser={currentUser}
    tournaments={tournaments}
    onSelectTournament={(t) => window.open(`/?mode=summary&tournamentId=${encodeURIComponent(t.id)}`, '_blank', 'noopener,noreferrer')}
    onBackToApp={() => setViewMode('TOURNAMENTS')}
    onLogout={handleLogout}
    onRefreshData={() => dbService.fetchBootstrapData().then((data) => { if (data?.tournaments) setTournaments(data.tournaments); })}
  /><OrganizerMobileNav user={currentUser} mode={viewMode} onSelect={selectViewMode} /></div>;

  // Dedicated clean view for public live spectator summary (?mode=summary)
  if (viewMode === 'PUBLIC_SUMMARY') {
    return (
      <PublicSpectatorView
        tournament={tournament}
        teams={activeTeams}
        players={activePlayers}
        currentPlayer={currentPlayer}
        currentBid={currentBid}
        leadingTeam={leadingTeam}
        bidsHistory={bidsHistory}
        onExitSpectatorMode={() => setViewMode('TOURNAMENT_OVERVIEW')}
      />
    );
  }

  // Special full-screen transparent view for OBS Studio
  if (viewMode === 'OBS') {
    return (
      <div className="relative min-h-screen bg-transparent">
        {/* Floating Back to App Button */}
        <button
          onClick={() => setViewMode('TOURNAMENT_OVERVIEW')}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-obsidian-900/90 text-white border border-white/20 hover:bg-obsidian-850 shadow-lg pointer-events-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit OBS View
        </button>

        <ObsOverlayView
          timerSeconds={rules.timerSeconds}
          currency={rules.currency}
          currentPlayer={currentPlayer}
          currentBid={currentBid}
          leadingTeam={leadingTeam}
          bidsHistory={bidsHistory}
          isSold={isSold}
          isUnsold={isUnsold}
          lastSoldInfo={lastSoldInfo}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-obsidian-950 text-slate-100 flex flex-col ${viewMode === 'STAGE' ? 'stage-mode' : ''}`}>
      {saveMessage && <div role="status" className="sticky top-0 z-50 bg-amber-950 px-4 py-2 text-amber-100 text-center">{saveMessage}<button onClick={() => dbService.flushSync().catch(() => {})} className="ml-4 underline">Retry save</button></div>}
      {/* Top Navbar */}
      <Navbar
        currentMode={viewMode}
        onSelectMode={selectViewMode}
        tournament={tournament}
        tournaments={visibleTournaments}
        onSelectTournament={handleSelectTournament}
        onCreateNewTournament={() => {
          setEditingTournamentData(null);
          setIsTournamentModalOpen(true);
        }}
        onOpenDatabaseModal={() => setIsDbModalOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenFortuneWheel={() => setIsFortuneWheelOpen(true)}
        activePortal={activePortal}
        onSelectPortal={(portal) => {
          setActivePortal(portal);
          if (portal === 'USER') {
            setViewMode('USER_PORTAL');
          } else {
            setViewMode('TOURNAMENT_OVERVIEW');
          }
        }}
      />

      {activePortal === 'ORGANIZER' && <OrganizerMobileNav user={currentUser} mode={viewMode} onSelect={selectViewMode} />}
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-28 lg:pb-8">

        {/* PART 2: USER / PLAYER PORTAL */}
        {(activePortal === 'USER' || viewMode === 'USER_PORTAL') && viewMode !== 'ADMIN_PANEL' && (
          <UserPortalView
            tournaments={tournaments}
            teams={teams}
            players={players}
            currentUser={currentUser}
            onSelectTournament={handleSelectTournament}
            onOpenRegisterForTournament={(t) => {
              handleSelectTournament(t.id);
              setViewMode('PUBLIC_REGISTER');
            }}
            onOpenSpectatorForTournament={(t) => {
              handleSelectTournament(t.id);
              setViewMode('PUBLIC_SUMMARY');
            }}
            onSwitchToOrganizerPortal={() => {
              setActivePortal('ORGANIZER');
              setViewMode('TOURNAMENT_OVERVIEW');
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
          />
        )}

        {/* PART 1: ORGANIZER PORTAL SUITE */}
        {activePortal === 'ORGANIZER' && viewMode !== 'USER_PORTAL' && (
          <>
            {viewMode === 'ADMIN_PANEL' && (
          currentUser?.role === 'ADMIN' ? (
            <AdminPanelView
              currentUser={currentUser}
              tournaments={tournaments}
              onSelectTournament={(t) => {
                handleSelectTournament(t.id);
              }}
              onBackToApp={() => setViewMode('TOURNAMENT_OVERVIEW')}
              onRefreshData={() => {
                dbService.fetchBootstrapData().then((data) => {
                  if (data?.tournaments) setTournaments(data.tournaments);
                  if (data?.teams) setTeams(data.teams);
                  if (data?.players) setPlayers(data.players);
                });
              }}
              onLogout={handleLogout}
            />
          ) : (
            <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 rounded-3xl">
              <h3 className="text-xl font-bold text-rose-400">Super Admin Access Required</h3>
              <p className="text-xs text-slate-400">
                You must be signed in with a Super Administrator account to view and manage platform data.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
              >
                Sign In as Admin
              </button>
            </div>
          )
        )}

        {viewMode === 'ORGANIZER_PROFILE' && <OrganizerProfileView key={currentUser.id} user={currentUser} tournaments={visibleTournaments} onUpdateUser={setCurrentUser} onBack={() => selectViewMode('TOURNAMENTS')} onAdmin={() => selectViewMode('ADMIN_PANEL')} onPlayer={enterPlayerMode} onLogout={handleLogout} />}
        {viewMode === 'TOURNAMENT_OVERVIEW' && (
          <TournamentDashboardView
            tournament={tournament}
            allTournaments={visibleTournaments}
            teams={activeTeams}
            players={activePlayers}
            onSelectViewMode={selectViewMode}
            onEditTournament={() => {
              setEditingTournamentData(tournament);
              setIsTournamentModalOpen(true);
            }}
            onSwitchTournament={() => setViewMode('TOURNAMENTS')}
            onCreateNewTournament={() => {
              setEditingTournamentData(null);
              setIsTournamentModalOpen(true);
            }}
            onApprovePlayer={handleApprovePlayer}
            onRejectPlayer={handleRejectPlayer}
            onOpenFortuneWheel={() => setIsFortuneWheelOpen(true)}
            onOpenBulkUploadModal={() => setIsBulkUploadModalOpen(true)}
          />
        )}

        {viewMode === 'TOURNAMENTS' && (
          <>
          {legacyAvailable && tournaments.length === 0 && <button onClick={importBrowserData} className="mb-5 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950">Import this browser’s previous tournaments</button>}
          <TournamentsListView
            tournaments={visibleTournaments}
            activeTournamentId={activeTournamentId}
            teams={teams}
            players={players}
            onSelectTournament={handleSelectTournament}
            onEditTournament={(t) => {
              setEditingTournamentData(t);
              setIsTournamentModalOpen(true);
            }}
            onDeleteTournament={handleDeleteTournament}
            onCreateNewTournament={() => {
              setEditingTournamentData(null);
              setIsTournamentModalOpen(true);
            }}
          />
          </>
        )}

        {viewMode === 'STAGE' && (
          <StageView
            tournamentName={tournament.name}
            tournamentId={tournament.id}
            timerSeconds={rules.timerSeconds}
            currency={rules.currency}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            leadingTeam={leadingTeam}
            bidsHistory={bidsHistory}
            allTeams={activeTeams}
            isSold={isSold}
            isUnsold={isUnsold}
            lastSoldInfo={lastSoldInfo}
            onNextPlayer={handleRandomDraw}
          />
        )}

        {viewMode === 'AUCTIONEER' && (
          <AuctioneerConsole
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            leadingTeam={leadingTeam}
            allTeams={activeTeams}
            allPlayers={activePlayers}
            rules={rules}
            onPlaceBid={handlePlaceBid}
            onSold={handleSold}
            onUnsold={handleUnsold}
            onUndoBid={handleUndoBid}
            onSelectPlayer={handleSelectPlayer}
            onRandomDraw={handleRandomDraw}
            onOpenFortuneWheel={() => setIsFortuneWheelOpen(true)}
            onLaunchAcceleratedRound={handleLaunchAcceleratedRound}
          />
        )}

        {viewMode === 'PADDLE' && (
          <TeamPaddleView
            allTeams={activeTeams}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            leadingTeam={leadingTeam}
            allPlayers={activePlayers}
            rules={rules}
            onPlaceBid={handlePlaceBid}
          />
        )}

        {viewMode === 'PLAYERS' && (
          <PlayerManagerView
            teams={activeTeams}
            onCorrect={handlePlayerCorrection}
            customFields={tournament.customFields}
            currency={rules.currency}
            defaultBasePrice={tournament.defaultBasePrice}
            tournamentId={tournament.id}
            players={activePlayers}
            onAddPlayer={handleAddPlayer}
            onBulkAddPlayers={handleBulkAddPlayers}
            onDeletePlayer={handleDeletePlayer}
            onNavigateToFormBuilder={() => setViewMode('FORM_BUILDER')}
            onApprovePlayer={handleApprovePlayer}
            onRejectPlayer={handleRejectPlayer}
            onVerifyPayment={(id) => setPlayers(prev => prev.map(p => p.id === id && p.paymentScreenshotUrl ? { ...p, paymentStatus: 'VERIFIED' } : p))}
          />
        )}

        {viewMode === 'FORM_BUILDER' && (
          <RegistrationFormBuilder
            tournament={tournament}
            onUpdateTournament={handleUpdateTournament}
            onPreviewPublicForm={openRegistrationPreview}
          />
        )}

        {viewMode === 'TEAMS' && (
          <TeamsManagerView
            teams={activeTeams}
            tournament={tournament}
            tournaments={visibleTournaments}
            onAddTeam={handleAddTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            onUpdateTournament={handleUpdateTournament}
            onOpenTournamentModal={() => {
              setEditingTournamentData(tournament);
              setIsTournamentModalOpen(true);
            }}
          />
        )}

        {viewMode === 'SQUADS' && (
          <SquadSummaryView
            teams={activeTeams}
            players={activePlayers}
            rules={rules}
            onOpenPoster={(player, team, price) => setPosterData({ player, team, price })}
          />
        )}

        {viewMode === 'RULES' && (
          <RulesSettingsView
            defaultBidIncrement={tournament.defaultBasePrice}
            rules={rules}
            onUpdateRules={(updated) => { dbService.queueSync({ rules: updated, tournamentId: activeTournamentId }); setRules(updated); setTournaments(prev => prev.map(t => t.id === activeTournamentId ? { ...t, rules: updated } : t)); }}
            onResetAuction={handleResetAuction}
          />
        )}
      </>
    )}
      </main>

      {/* Create / Edit Tournament Modal */}
      <TournamentModal
        isOpen={isTournamentModalOpen}
        initialData={editingTournamentData}
        onSave={(data) => {
          if (editingTournamentData) {
            handleUpdateTournament(data as Tournament);
          } else {
            handleCreateTournament(data);
          }
        }}
        onClose={() => {
          setIsTournamentModalOpen(false);
          setEditingTournamentData(null);
        }}
      />

      {/* Social Media Poster Modal */}
      {posterData && (
        <SoldPosterModal
          player={posterData.player}
          team={posterData.team}
          price={posterData.price}
          tournament={tournament}
          onClose={() => setPosterData(null)}
        />
      )}

      {/* SQLite Database Backup & Status Modal */}
      <DatabaseBackupModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        tournamentsCount={tournaments.length}
        teamsCount={teams.length}
        playersCount={players.length}
        onReloadData={() => {
          dbService.fetchBootstrapData().then((data) => {
            if (data?.tournaments) setTournaments(data.tournaments);
            if (data?.teams) setTeams(data.teams);
            if (data?.players) setPlayers(data.players);
          });
        }}
      />

      {/* Auth Modal (Sign In / Register / Quick 1-Click Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Interactive Fortune Wheel Modal */}
      <FortuneWheelModal
        isOpen={isFortuneWheelOpen}
        onClose={() => setIsFortuneWheelOpen(false)}
        teams={activeTeams}
        players={activePlayers}
        onSelectPlayer={handleSelectPlayer}
      />

      {/* Excel / CSV Bulk Player Upload Modal */}
      <BulkPlayerUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        tournamentId={tournament.id}
        defaultBasePrice={tournament.defaultBasePrice}
        onBulkAddPlayers={handleBulkAddPlayers}
      />

      {/* Offline Alert Network Banner */}

      {/* Footer Branding */}
      <footer className="p-4 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        Cricket Auction Pro 2026 • Designed with Ultra-Luxury IPL Broadcast Experience
      </footer>
    </div>
  );
}

export default App;
