import { getBidBudget, withSlotReserve } from '../shared/auctionBudget.js';
import { cacheSnapshot, loadSnapshot } from './services/auctionCache';
import { changedRecords } from '../shared/recordChanges.js';
import { requestJson, createJsonPoller } from '../shared/requestJson.js';
import { lazyWithRecovery as lazy } from './utils/lazyWithRecovery';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppShell } from './components/AppShell';
import { FeedbackHost, notify } from './ui/kit';
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
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
} from './types';
import { TournamentDashboardView } from './components/TournamentDashboardView';
import { TournamentsListView } from './components/TournamentsListView';
import { AuthModal } from './components/AuthModal';
import { syncEngine, SyncAction } from './utils/syncEngine';
import { dbService } from './services/dbService';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { LandingScreen } from './components/LandingScreen';

const OrganizerProfileView = lazy(() => import('./components/OrganizerProfileView').then(module => ({ default: module.OrganizerProfileView })));
const RegistrationSummaryView = lazy(() => import('./components/RegistrationSummaryView').then(module => ({ default: module.RegistrationSummaryView })));
const TournamentModal = lazy(() => import('./components/TournamentModal').then(module => ({ default: module.TournamentModal })));
const StageView = lazy(() => import('./components/StageView').then(module => ({ default: module.StageView })));
const AuctioneerConsole = lazy(() => import('./components/AuctioneerConsole').then(module => ({ default: module.AuctioneerConsole })));
const TeamPaddleView = lazy(() => import('./components/TeamPaddleView').then(module => ({ default: module.TeamPaddleView })));
const PlayerManagerView = lazy(() => import('./components/PlayerManagerView').then(module => ({ default: module.PlayerManagerView })));
const TeamsManagerView = lazy(() => import('./components/TeamsManagerView').then(module => ({ default: module.TeamsManagerView })));
const RulesSettingsView = lazy(() => import('./components/RulesSettingsView').then(module => ({ default: module.RulesSettingsView })));
const SquadSummaryView = lazy(() => import('./components/SquadSummaryView').then(module => ({ default: module.SquadSummaryView })));
const ObsOverlayView = lazy(() => import('./components/ObsOverlayView').then(module => ({ default: module.ObsOverlayView })));
const SoldPosterModal = lazy(() => import('./components/SoldPosterModal').then(module => ({ default: module.SoldPosterModal })));
const RegistrationFormBuilder = lazy(() => import('./components/RegistrationFormBuilder').then(module => ({ default: module.RegistrationFormBuilder })));
const PublicRegistrationView = lazy(() => import('./components/PublicRegistrationView').then(module => ({ default: module.PublicRegistrationView })));
const AdminPanelView = lazy(() => import('./components/AdminPanelView').then(module => ({ default: module.AdminPanelView })));
const FortuneWheelModal = lazy(() => import('./components/FortuneWheelModal').then(module => ({ default: module.FortuneWheelModal })));
const BulkPlayerUploadModal = lazy(() => import('./components/BulkPlayerUploadModal').then(module => ({ default: module.BulkPlayerUploadModal })));
const PublicSpectatorView = lazy(() => import('./components/PublicSpectatorView').then(module => ({ default: module.PublicSpectatorView })));
const DatabaseBackupModal = lazy(() => import('./components/DatabaseBackupModal').then(module => ({ default: module.DatabaseBackupModal })));
const PlayerApp = lazy(() => import('./components/player/PlayerApp').then(module => ({ default: module.PlayerApp })));
const DeviceSimulatorView = lazy(() => import('./components/DeviceSimulatorView').then(module => ({ default: module.DeviceSimulatorView })));

const RESUMABLE_VIEWS: ViewMode[] = ['TOURNAMENT_OVERVIEW', 'TOURNAMENTS', 'AUCTIONEER', 'STAGE', 'PADDLE', 'PLAYERS', 'TEAMS', 'SQUADS', 'RULES', 'FORM_BUILDER', 'ADMIN_PANEL', 'ORGANIZER_PROFILE'];
const PLAYER_ROLE_KEY = 'cap_app_role';
/** Player area opens via ?mode=player, or automatically for someone who last used it on this device. */
const startsInPlayerMode = () => {
  if (typeof window === 'undefined') return false;
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'player' || mode === 'user' || mode === 'portal') return true;
  if (['user', 'player'].includes(new URLSearchParams(window.location.search).get('portal') || '')) return true;
  try { return !mode && localStorage.getItem(PLAYER_ROLE_KEY) === 'player'; } catch { return false; }
};

function AppContent() {
  const settling = useRef(false);
  const mutationRevision = useRef(0);
  const snapshotVersions = useRef<Record<string, { players: string; teams: string }>>({});
  const seenAuctionEvent = useRef('');
  const serverTournaments = useRef('');
  const serverTeams = useRef('');
  const serverPlayers = useRef('');
  const [saveMessage, setSaveMessage] = useState('');
  const [auctionBusy, setAuctionBusy] = useState(false);
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
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER' | 'ADMIN_LOGIN'>('LOGIN');

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setViewMode(user.role === 'ADMIN' ? 'ADMIN_PANEL' : 'TOURNAMENT_OVERVIEW');
  };

  const handleLogout = async () => {
    if (settling.current) { setSaveMessage('Wait for the auction sync before signing out.'); return; }
    try { await dbService.flushSync(); await flushBids(); } catch { setSaveMessage('Save your pending changes before signing out.'); return; }
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
    setViewMode('TOURNAMENTS');
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
    }
    return 'TOURNAMENT_OVERVIEW';
  });

  const selectViewMode = (mode: ViewMode) => {
    if (!tournament.id && !['TOURNAMENTS', 'ADMIN_PANEL', 'ORGANIZER_PROFILE'].includes(mode)) { setViewMode('TOURNAMENTS'); return; }
    if (mode === 'ADMIN_PANEL' && currentUser?.role !== 'ADMIN') return;
    if (mode === 'OBS' || mode === 'PUBLIC_SUMMARY') {
      window.open(`/?mode=${mode === 'OBS' ? 'obs' : 'summary'}&tournamentId=${encodeURIComponent(tournament.id)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (mode === 'PUBLIC_REGISTER') { openRegistrationPreview(); return; }
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
  const [unsoldPlayer, setUnsoldPlayer] = useState<Player | null>(null);
  const isUnsold = Boolean(unsoldPlayer);
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
    if (startsInPlayerMode()) { setAuthChecked(true); return; }
    requestJson('/api/auth/me').then((data) => data.user as User).then(setCurrentUser).catch(() => {
      setCurrentUser(null);
      // The session cookie is httpOnly, so only the server can say who is signed in.
      if (params.has('tournamentId') && params.get('mode') === 'players') setViewMode('PUBLIC_REGISTRATIONS');
    }).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_REGISTER') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) { if (currentUser && tournament.id) setPublicTournament(tournament); else setDataError('Tournament link is missing its ID.'); return; }
    const controller = new AbortController();
    requestJson(`/api/public/tournaments/${encodeURIComponent(id)}`, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) { setPublicTournament(data.tournament); setDataError(''); }
    }).catch((err) => { if (!controller.signal.aborted) setDataError(err.message); });
    return () => controller.abort();
  }, [viewMode, currentUser?.id, tournament.id]);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_SUMMARY' && viewMode !== 'OBS') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) return;
    let cancelled = false;
    let refreshing = false;
    let rosterVersion = '';
    const poll = createJsonPoller();
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (cancelled || refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      controller = new AbortController();
      const requestController = controller;
      const timeout = window.setTimeout(() => requestController.abort(), 15000);
      try {
        const data = await poll(`/api/public/tournaments/${encodeURIComponent(id)}/summary${rosterVersion ? '?rosterVersion=' + rosterVersion : ''}`, { cache: 'no-store', signal: requestController.signal });
        if (cancelled) return;
        setDataError('');
        if (!data) return;
        consumeAuctionEvent(data.liveState?.lastEvent);
        if (data.tournament) {
          rosterVersion = data.rosterVersion || '';
          setPublicSummary(data);
        } else {
          setPublicSummary(prev => prev && ({ ...prev, liveState: data.liveState }));
        }
      } catch (err) { if (!cancelled) setDataError(requestController.signal.aborted ? 'Loading took too long. Please retry.' : (err as Error).message); }
      finally { window.clearTimeout(timeout); refreshing = false; }
    };
    void refresh();
    const timer = setInterval(refresh, ['STAGE', 'OBS', 'PADDLE', 'AUCTIONEER'].includes(viewMode) ? 1000 : 2000);
    return () => { cancelled = true; controller?.abort(); clearInterval(timer); };
  }, [viewMode]);

  // Load only the signed-in organizer's records from the server.
  useEffect(() => {
    if (!currentUser || ['PUBLIC_REGISTER', 'PUBLIC_SUMMARY', 'PUBLIC_REGISTRATIONS', 'OBS'].includes(viewMode) && new URLSearchParams(window.location.search).has('tournamentId')) return;
    let cancelled = false;
    setDataReady(false);
    setDataError('');
    dbService.setScope(currentUser.id);
    dbService.flushSync().then(() => loadSnapshot('auction-roster:' + currentUser.id, () => dbService.fetchBootstrapData())).then((data) => {
      if (cancelled) return;
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
      // A refresh during the auction returns to the same tournament and screen.
      let remembered: { id?: string; view?: ViewMode } = {};
      try { remembered = JSON.parse(sessionStorage.getItem(`cap_place_${currentUser.id}`) || '{}'); } catch { /* start fresh */ }
      const resumed = data.tournaments?.find(t => t.id === remembered.id);
      const opened = requested || resumed || data.tournaments?.[0];
      setActiveTournamentId(opened?.id || '');
      if (opened) setRules(opened.rules || initialRules);
      if (new URLSearchParams(window.location.search).get('mode') !== 'summary') {
        if (new URLSearchParams(window.location.search).get('mode') === 'players' && requested) setViewMode('PLAYERS');
        else if (resumed && remembered.view && RESUMABLE_VIEWS.includes(remembered.view)) setViewMode(remembered.view);
        else if (currentUser.role === 'ADMIN') setViewMode('ADMIN_PANEL');
        else setViewMode(data.tournaments?.length === 1 ? 'TOURNAMENT_OVERVIEW' : 'TOURNAMENTS');
      }
      setDataReady(true);
    }).catch((err) => { if (!cancelled) setDataError(err.message); });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!dataReady || !currentUser) return;
    try { sessionStorage.setItem(`cap_place_${currentUser.id}`, JSON.stringify({ id: activeTournamentId, view: viewMode })); } catch { /* private mode */ }
  }, [dataReady, currentUser?.id, activeTournamentId, viewMode]);

  const bidKey = JSON.stringify(['auction-bids', currentUser?.id, activeTournamentId]);
  const currentScope = useRef(bidKey);
  currentScope.current = bidKey;
  const auctionRevision = useRef('');
  const [queuedCount, setQueuedCount] = useState(0);
  const readBids = (): { revision: string; bids: BidRecord[] } =>
    JSON.parse(sessionStorage.getItem(bidKey) || '{"revision":"","bids":[]}');

  // Persist changes only after the organizer's server data has loaded.
  useEffect(() => {
    const value = JSON.stringify(tournaments);
    if (dataReady && value !== serverTournaments.current) { const changes = changedRecords(serverTournaments.current, tournaments); serverTournaments.current = value; if (changes.length) dbService.queueSync({ tournaments: changes }); }
  }, [tournaments, dataReady, currentUser?.role]);

  useEffect(() => {
    if (!activeTournamentId) return;
    syncEngine.setScope(activeTournamentId);
    // Another tab may switch tournament; bidding must always use that tournament's rules.
    const active = tournaments.find(t => t.id === activeTournamentId);
    if (active?.rules) setRules(active.rules);
  }, [activeTournamentId]);

  useEffect(() => {
    if (!dataReady || !activeTournamentId) return;
    setLiveReady(false);
    setLoadedLiveTournamentId('');
    let cancelled = false;
    dbService.flushSync().then(() => loadSnapshot<{ liveState: any }>(bidKey + '/live', () => requestJson(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/live`))).then(data => data.liveState).then(state => {
      if (cancelled) return;
      auctionRevision.current = state.revision || '';
      const pending = readBids().bids;
      const latest = pending[pending.length - 1];
      setQueuedCount(pending.length);
      if (latest && latest.playerId === state.currentPlayerId) {
        state = { ...state, currentBid: latest.amount, leadingTeam: teams.find(team => team.id === latest.teamId),
          bidsHistory: [...pending].reverse().concat((state.bidsHistory || []).filter((bid: BidRecord) => !pending.some(item => item.id === bid.id))) };
      }
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
    if (dataReady && value !== serverTeams.current) { const changes = changedRecords(serverTeams.current, teams); serverTeams.current = value; if (changes.length) dbService.queueSync({ teams: changes }); }
  }, [teams, dataReady]);

  useEffect(() => {
    const value = JSON.stringify(players);
    if (dataReady && value !== serverPlayers.current) { const changes = changedRecords(serverPlayers.current, players); serverPlayers.current = value; if (changes.length) dbService.queueSync({ players: changes }); }
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
          setUnsoldPlayer(action.payload.player);
          setTimeout(() => setUnsoldPlayer(null), 2800);
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
              p.id === action.payload.playerId ? { ...p, approvalStatus: 'APPROVED' } : p
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
  const activeTeams = useMemo(() => teams.filter(t => !t.tournamentId || t.tournamentId === tournament.id), [teams, tournament.id]);
  const activePlayers = useMemo(() => players.filter(p => !p.tournamentId || p.tournamentId === tournament.id), [players, tournament.id]);

  // Prepare the random draw while the current lot is on screen. Reuse the same
  // candidate on click so its photo is already in the browser cache.
  const nextDrawPlayer = useMemo(() => {
    const available = activePlayers.filter(p => p.id !== currentPlayerId && (!p.approvalStatus || p.approvalStatus === 'APPROVED') && ['AVAILABLE', 'IN_AUCTION'].includes(p.status));
    return available[Math.floor(Math.random() * available.length)];
  }, [activePlayers, currentPlayerId]);
  useEffect(() => {
    if (!nextDrawPlayer?.photoUrl || !['STAGE', 'AUCTIONEER'].includes(viewMode)) return;
    const image = new Image();
    image.src = nextDrawPlayer.photoUrl;
  }, [nextDrawPlayer?.photoUrl, viewMode]);
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
      setUnsoldPlayer(event.player); setTimeout(() => setUnsoldPlayer(null), Math.max(0, 2800 - elapsed));
    }
  };

  const applyAuctionSnapshot = (data: any, id: string) => {
    const state = data.liveState || {};
    auctionRevision.current = state.revision || '';
    cacheSnapshot(bidKey + '/live', { liveState: state });
    consumeAuctionEvent(state.lastEvent);
    setCurrentPlayerId(state.currentPlayerId || '');
    setCurrentBid(state.currentBid || 0);
    setLeadingTeam(state.leadingTeam || null);
    setBidsHistory(state.bidsHistory || []);
    if (data.teams) setTeams(prev => { const next = [...prev.filter(t => t.tournamentId !== id), ...data.teams]; serverTeams.current = JSON.stringify(next); return next; });
    if (data.players) setPlayers(prev => { const next = [...prev.filter(p => p.tournamentId !== id), ...data.players]; serverPlayers.current = JSON.stringify(next); return next; });
  };

  // Sends queued bids in the background. Bids placed while a request is in flight
  // stay queued (with the new revision) and go out right after, so the UI never waits.
  const bidFlight = useRef<Promise<void> | null>(null);
  const flushBids = async (): Promise<void> => {
    while (bidFlight.current) { try { await bidFlight.current; } catch { /* retried below */ } }
    const queue = readBids();
    if (!queue.bids.length) return;
    const scope = bidKey;
    const sentIds = new Set(queue.bids.map(b => b.id));
    const path = '/api/tournaments/' + encodeURIComponent(activeTournamentId);
    const settle = (result: any) => {
      const rest = readBids().bids.filter(b => !sentIds.has(b.id));
      if (rest.length && result?.liveState) {
        auctionRevision.current = result.liveState.revision || '';
        sessionStorage.setItem(scope, JSON.stringify({ revision: auctionRevision.current, bids: rest }));
        if (currentScope.current === scope) setQueuedCount(rest.length);
        return true;
      }
      sessionStorage.removeItem(scope);
      if (currentScope.current === scope) { setQueuedCount(0); applyAuctionSnapshot(result, activeTournamentId); }
      return false;
    };
    const run = (async () => {
      try {
        const result = await requestJson(path + '/auction', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'BID_BATCH', playerId: queue.bids[0].playerId, ...queue }),
        });
        if (settle(result)) { bidFlight.current = null; await flushBids(); }
      } catch (error) {
        if ((error as { status?: number }).status === 409) {
          const result = await requestJson(path + '/live');
          sessionStorage.removeItem(scope);
          if (currentScope.current === scope) { setQueuedCount(0); applyAuctionSnapshot(result, activeTournamentId); }
        }
        throw error;
      }
    })();
    bidFlight.current = run;
    try { await run; } finally { if (bidFlight.current === run) bidFlight.current = null; }
  };
  const bidTimer = useRef<number | undefined>(undefined);
  const scheduleBidPush = () => {
    window.clearTimeout(bidTimer.current);
    bidTimer.current = window.setTimeout(() => {
      if (settling.current) return;
      flushBids().catch(error => notify((error as Error).message, 'warn'));
    }, 120);
  };

  const runAuctionCommand = async (action: string, extra: Record<string, unknown> = {}) => {
    if (settling.current || !liveReady) return;
    settling.current = true;
    setAuctionBusy(true);
    const id = activeTournamentId;
    mutationRevision.current++;
    try {
      await dbService.flushSync();
      await flushBids();
      if (currentScope.current !== bidKey || action === 'SYNC') return;
      const data = await requestJson(`/api/tournaments/${encodeURIComponent(id)}/auction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, playerId: currentPlayerId, ...extra }),
      });
      applyAuctionSnapshot(data, id);
      } catch (error) { notify((error as Error).message, 'warn'); }
    finally { settling.current = false; setAuctionBusy(false); }
  };
  useEffect(() => {
    if (!liveReady || loadedLiveTournamentId !== activeTournamentId) return;
    const sync = () => { if (readBids().bids.length && !settling.current) flushBids().catch(() => { /* retried on next tick */ }); };
    const timer = window.setInterval(sync, 3000);
    window.addEventListener('online', sync);
    return () => { window.clearInterval(timer); window.removeEventListener('online', sync); };
  }, [bidKey, liveReady, loadedLiveTournamentId]);

  const handlePlaceBid = (team: Team, amount: number) => {
    if (settling.current || !liveReady || loadedLiveTournamentId !== activeTournamentId) return;
    if (!currentPlayer) return;
    const budget = getBidBudget(team, activePlayers, withSlotReserve(rules, currentPlayer.basePrice));
    if (budget.squadComplete || amount > budget.maxBid) {
      notify(budget.squadComplete ? 'Squad full. No further bids allowed.' : 'Bid exceeds the team maximum.', 'warn');
      return;
    }
    try {
      const queue = readBids();
      if (amount <= (queue.bids[queue.bids.length - 1]?.amount ?? currentBid)) return;
      const record = { id: crypto.randomUUID(), playerId: currentPlayerId, teamId: team.id, teamName: team.name, amount, timestamp: Date.now() };
      if (!queue.bids.length) queue.revision = auctionRevision.current;
      queue.bids.push(record);
      sessionStorage.setItem(bidKey, JSON.stringify(queue));
      mutationRevision.current++;
      setQueuedCount(queue.bids.length);
      setCurrentBid(amount);
      setLeadingTeam(team);
      setBidsHistory(prev => [record, ...prev]);
      scheduleBidPush();
    } catch { notify('Browser could not save the bid. Please retry.', 'warn'); }
  };
  const handleSold = () => { void runAuctionCommand('SOLD', { teamId: leadingTeam?.id, amount: currentBid }); };
  const handleUnsold = () => { void runAuctionCommand('UNSOLD'); };
  const handleUndoBid = () => { void runAuctionCommand('UNDO'); };
  const handleSelectPlayer = (player: Player) => { void runAuctionCommand('SELECT', { playerId: player.id }); };

  // Display and paddle clients read the same authoritative auction state.
  useEffect(() => {
    if (!dataReady || !activeTournamentId || !['STAGE', 'AUCTIONEER', 'PADDLE', 'OBS', 'PUBLIC_SUMMARY', 'PLAYERS', 'TEAMS', 'SQUADS', 'TOURNAMENT_OVERVIEW'].includes(viewMode)) return;
    let cancelled = false;
    let refreshing = false;
    const poll = createJsonPoller();
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (cancelled || refreshing || document.visibilityState === 'hidden' || settling.current || readBids().bids.length || dbService.hasPending()) return;
      refreshing = true;
      try {
        const revision = mutationRevision.current;
        const versions = snapshotVersions.current[activeTournamentId];
        const query = new URLSearchParams(versions ? { playersVersion: versions.players, teamsVersion: versions.teams } : {});
        controller = new AbortController();
        const data = await poll(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/snapshot?${query}`, { cache: 'no-store', signal: controller.signal }, 10000);
        if (!data) return;
        if (!cancelled && revision === mutationRevision.current && !settling.current && !readBids().bids.length && !dbService.hasPending()) {
          applyAuctionSnapshot(data, activeTournamentId);
          if (data.versions) snapshotVersions.current[activeTournamentId] = data.versions;
        }
      } catch { /* Existing data stays visible until the next successful refresh. */ }
      finally { refreshing = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => { cancelled = true; controller?.abort(); clearInterval(timer); };
  }, [viewMode, dataReady, activeTournamentId]);

  // Random Draw
  const handleRandomDraw = () => {
    const unAuctioned = activePlayers.filter(
      (p) => (!p.approvalStatus || p.approvalStatus === 'APPROVED') && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION')
    );
    if (unAuctioned.length === 0) {
      notify('All players have been auctioned. See Squads for the results.');
      return;
    }
    handleSelectPlayer(nextDrawPlayer || unAuctioned[0]);
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
    if (settling.current) throw new Error('Another change is being saved. Please try again.');
    settling.current = true;
    mutationRevision.current++;
    try {
      await dbService.flushSync();
      await flushBids();
      const response = await fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/player-correction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, playerId, teamId, amount }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Correction failed');
      // Apply the committed mutation directly, without refetching every player photo.
      setPlayers(prev => {
        const next = prev.filter(p => !(p.tournamentId === activeTournamentId && p.id === playerId));
        if (result.player) next.push(result.player);
        serverPlayers.current = JSON.stringify(next);
        return next;
      });
      applyAuctionSnapshot({ teams: result.teams, liveState: result.liveState }, activeTournamentId);
      setSaveMessage('');
    } finally { settling.current = false; }
  };
  const handleDeletePlayer = (playerId: string) => handlePlayerCorrection('DELETE', playerId);

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
    } catch (error) { notify((error as Error).message, 'warn'); }
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
    if (!publicTournament) return <LoadingScreen error={dataError} />;
    return (
      <PublicRegistrationView
        tournament={publicTournament}
        onBack={leaveRegistration}
        onRegisterPlayer={handleRegisterPlayer}
      />
    );
  }

  if (viewMode === 'PUBLIC_SUMMARY' && new URLSearchParams(window.location.search).has('tournamentId')) {
    if (!publicSummary) return <LoadingScreen error={dataError} />;
    return <>{dataError && <div role="status" className="bg-slate-950 text-amber-300 text-center text-sm py-1">{dataError}</div>}<PublicSpectatorView tournament={publicSummary.tournament} teams={publicSummary.teams} players={publicSummary.players} registrationStats={publicSummary.registrationStats} registrationPlayers={publicSummary.registrationPlayers} currentPlayer={publicSummary.players.find(p => p.id === (publicSummary as any).liveState?.currentPlayerId)} currentBid={(publicSummary as any).liveState?.currentBid} leadingTeam={publicSummary.teams.find(t => t.id === (publicSummary as any).liveState?.leadingTeam?.id)} bidsHistory={(publicSummary as any).liveState?.bidsHistory || []} /></>;
  }
  if (viewMode === 'OBS' && new URLSearchParams(window.location.search).has('tournamentId')) {
    if (!publicSummary) return <main className="sr-only" role="status">{dataError || 'Loading auction…'}</main>;
    const state = (publicSummary as any).liveState || {};
    return <ObsOverlayView timerSeconds={publicSummary.tournament.rules?.timerSeconds} currency={publicSummary.tournament.rules?.currency} currentPlayer={publicSummary.players.find(p => p.id === state.currentPlayerId) || null} currentBid={state.currentBid || 0} leadingTeam={publicSummary.teams.find(t => t.id === state.leadingTeam?.id) || null} bidsHistory={[]} isSold={isSold} isUnsold={isUnsold} lastSoldInfo={lastSoldInfo} />;
  }
  if (!authChecked) return <LoadingScreen />;
  if (!currentUser) return <LandingScreen onPlayer={enterPlayerMode} onOrganizer={() => { setAuthInitialMode('LOGIN'); setIsAuthModalOpen(true); }} onAdmin={() => { setAuthInitialMode('ADMIN_LOGIN'); setIsAuthModalOpen(true); }} onRegister={() => { setAuthInitialMode('REGISTER'); setIsAuthModalOpen(true); }}><AuthModal initialMode={authInitialMode} isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleLoginSuccess} /></LandingScreen>;
  if (!dataReady) return <LoadingScreen error={dataError} />;

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
    <AppShell
      mode={viewMode}
      onSelect={selectViewMode}
      tournament={tournament}
      tournaments={visibleTournaments}
      user={currentUser}
      onSelectTournament={(id) => { void handleSelectTournament(id); }}
      onCreateTournament={() => { setEditingTournamentData(null); setIsTournamentModalOpen(true); }}
      onOpenBackup={() => setIsDbModalOpen(true)}
      onOpenWheel={() => setIsFortuneWheelOpen(true)}
      onLogout={handleLogout}
    >
        {queuedCount > 0 && <div role="status" className="mb-2 text-sm text-amber-300">{queuedCount} local bid(s) awaiting server sync</div>}
        {saveMessage && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-950/60 px-4 py-2.5 text-sm text-amber-100">{saveMessage}<button onClick={() => dbService.flushSync().catch(() => {})} className="font-bold underline">Retry</button></div>}
        {viewMode === 'ADMIN_PANEL' && currentUser.role === 'ADMIN' && (
          <AdminPanelView
            currentUser={currentUser}
            tournaments={tournaments}
            onSelectTournament={(t) => { void handleSelectTournament(t.id); }}
            onBackToApp={() => setViewMode('TOURNAMENTS')}
            onRefreshData={() => {
              dbService.fetchBootstrapData().then((data) => {
                if (data?.tournaments) setTournaments(data.tournaments);
                if (data?.teams) setTeams(data.teams);
                if (data?.players) setPlayers(data.players);
              });
            }}
            onLogout={handleLogout}
          />
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
            auctionLive={!!currentPlayerId}
            onCreateNewTournament={() => {
              setEditingTournamentData(null);
              setIsTournamentModalOpen(true);
            }}
            onOpenFortuneWheel={() => setIsFortuneWheelOpen(true)}
            onOpenBulkUploadModal={() => setIsBulkUploadModalOpen(true)}
          />
        )}

        {viewMode === 'TOURNAMENTS' && (
          <>
          {legacyAvailable && tournaments.length === 0 && <button onClick={importBrowserData} className="btn btn-ghost mb-5">Import tournaments saved in this browser</button>}
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
            unsoldPlayer={unsoldPlayer}
            lastSoldInfo={lastSoldInfo}
            allPlayers={activePlayers}
            rules={rules}
            auctionBusy={auctionBusy || !liveReady}
            onPlaceBid={handlePlaceBid}
            onSold={handleSold}
            onUnsold={handleUnsold}
            onUndoBid={handleUndoBid}
            onNextPlayer={handleRandomDraw}
            onSelectPlayer={handleSelectPlayer}
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
            onReverseSale={(player, newStatus) => void runAuctionCommand('REVERSE_SALE', { soldPlayerId: player.id, amount: player.soldPrice, teamId: player.soldToTeamId, newStatus })}
            onLaunchAcceleratedRound={handleLaunchAcceleratedRound}
            busy={auctionBusy || !liveReady}
            onOpenPlayers={() => selectViewMode('PLAYERS')}
            onOpenTeams={() => selectViewMode('TEAMS')}
            isSold={isSold}
            isUnsold={isUnsold}
            lastSoldInfo={lastSoldInfo}
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
            onOpenTeams={() => selectViewMode('TEAMS')}
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
            onVerifyPayment={(id) => setPlayers(prev => prev.map(p => p.id === id && p.paymentScreenshotUrl ? { ...p, paymentStatus: 'VERIFIED' } : p))}
            onOpenBulkUpload={() => setIsBulkUploadModalOpen(true)}
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
            key={activeTournamentId}
            defaultBidIncrement={tournament.defaultBasePrice}
            rules={rules}
            onUpdateRules={(updated) => { dbService.queueSync({ rules: updated, tournamentId: activeTournamentId }); setRules(updated); setTournaments(prev => prev.map(t => t.id === activeTournamentId ? { ...t, rules: updated } : t)); }}
            onResetAuction={handleResetAuction}
          />
        )}
      {/* Create / Edit Tournament Modal */}
      {isTournamentModalOpen && (<TournamentModal
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
      />)}

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
      {isDbModalOpen && (<DatabaseBackupModal
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
      />)}

      {/* Interactive Fortune Wheel Modal */}
      {isFortuneWheelOpen && (<FortuneWheelModal
        isOpen={isFortuneWheelOpen}
        onClose={() => setIsFortuneWheelOpen(false)}
        teams={activeTeams}
        players={activePlayers}
        onSelectPlayer={handleSelectPlayer}
      />)}

      {/* Excel / CSV Bulk Player Upload Modal */}
      {isBulkUploadModalOpen && (<BulkPlayerUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        tournamentId={tournament.id}
        defaultBasePrice={tournament.defaultBasePrice}
        onBulkAddPlayers={handleBulkAddPlayers}
      />)}

    </AppShell>
  );
}

function LoadingScreen({ error }: { error?: string }) {
  return <main role="status" className="min-h-screen bg-obsidian-950 text-white grid place-items-center p-6 text-center">
    {error
      ? <div><Trophy className="w-10 h-10 mx-auto text-slate-500" /><p className="mt-3 text-slate-200">{error}</p><button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Try again</button></div>
      : <><Loader2 aria-hidden className="w-8 h-8 animate-spin text-gold-400" /><span className="sr-only">Loading</span></>}
  </main>;
}

export function App() {
  return <AppErrorBoundary><FeedbackHost /><Suspense fallback={<LoadingScreen />}><AppContent /></Suspense></AppErrorBoundary>;
}

export default App;
