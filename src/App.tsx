import React, { useState, useEffect } from 'react';
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
import { Navbar } from './components/Navbar';
import { TournamentDashboardView } from './components/TournamentDashboardView';
import { TournamentsListView } from './components/TournamentsListView';
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

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [loadedLiveTournamentId, setLoadedLiveTournamentId] = useState('');
  const [dataError, setDataError] = useState('');
  const [publicTournament, setPublicTournament] = useState<Tournament | null>(null);
  const [publicSummary, setPublicSummary] = useState<{ tournament: Tournament; teams: Team[]; players: Player[] } | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(() => !!(localStorage.getItem('cap_tournaments') || localStorage.getItem('cap_tournament')));
  // Database status modal state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (user.role === 'ADMIN') {
      setViewMode('ADMIN_PANEL');
    } else {
      setViewMode('TOURNAMENTS');
    }
  };

  const handleLogout = () => {
    dbService.clearPending();
    fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
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
    { ...initialTournament, id: '', name: 'My Tournaments', year: new Date().getFullYear(), season: '', status: 'UPCOMING' as const };

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
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'obs') return 'OBS';
      if (params.get('mode') === 'register' || params.get('mode') === 'form') {
        return 'PUBLIC_REGISTER';
      }
      if (params.get('mode') === 'summary' || params.get('mode') === 'live' || params.get('mode') === 'spectator') {
        return 'PUBLIC_SUMMARY';
      }
    }
    return 'TOURNAMENT_OVERVIEW';
  });

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
    fetch('/api/auth/me').then(async (res) => {
      if (!res.ok) return null;
      return (await res.json()).user as User;
    }).then(setCurrentUser).catch(() => setCurrentUser(null)).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_REGISTER') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) { setDataError('Tournament link is missing its ID.'); return; }
    fetch(`/api/public/tournaments/${encodeURIComponent(id)}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tournament unavailable');
      setPublicTournament(data.tournament);
    }).catch((err) => setDataError(err.message));
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'PUBLIC_SUMMARY') return;
    const id = new URLSearchParams(window.location.search).get('tournamentId');
    if (!id) return;
    fetch(`/api/public/tournaments/${encodeURIComponent(id)}/summary`).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tournament unavailable');
      setPublicSummary(data);
    }).catch(err => setDataError(err.message));
  }, [viewMode]);

  // Load only the signed-in organizer's records from the server.
  useEffect(() => {
    if (!currentUser || viewMode === 'PUBLIC_REGISTER') return;
    setDataReady(false);
    dbService.fetchBootstrapData().then((data) => {
      if (!data?.success) throw new Error('Could not load your tournaments');
      setTournaments(data.tournaments || []);
      setTeams(data.teams || []);
      setPlayers(data.players || []);
      setRules(data.rules || initialRules);
      setActiveTournamentId(currentUser.role === 'ADMIN' ? '' : data.tournaments?.[0]?.id || '');
      if (new URLSearchParams(window.location.search).get('mode') !== 'summary') {
        setViewMode(currentUser.role === 'ADMIN' ? 'ADMIN_PANEL' : 'TOURNAMENTS');
      }
      setDataReady(true);
    }).catch((err) => setDataError(err.message));
  }, [currentUser?.id]);

  // Persist changes only after the organizer's server data has loaded.
  useEffect(() => {
    if (dataReady && currentUser?.role !== 'ADMIN') dbService.queueSync({ tournaments });
  }, [tournaments, dataReady, currentUser?.role]);

  useEffect(() => {
    if (activeTournamentId) syncEngine.setScope(activeTournamentId);
  }, [activeTournamentId]);

  useEffect(() => {
    if (!dataReady || !activeTournamentId) return;
    setLiveReady(false);
    setLoadedLiveTournamentId('');
    fetch(`/api/tournaments/${encodeURIComponent(activeTournamentId)}/live`).then(async res => {
      if (!res.ok) throw new Error('Could not load live auction');
      return (await res.json()).liveState;
    }).then(state => {
      setCurrentPlayerId(state.currentPlayerId || '');
      setCurrentBid(state.currentBid || 0);
      setLeadingTeam(state.leadingTeam || null);
      setBidsHistory(state.bidsHistory || []);
      setLoadedLiveTournamentId(activeTournamentId);
      setLiveReady(true);
    }).catch(err => setDataError(err.message));
  }, [activeTournamentId, dataReady]);

  useEffect(() => {
    if (dataReady && liveReady && activeTournamentId && loadedLiveTournamentId === activeTournamentId) dbService.queueSync({ liveState: { tournamentId: activeTournamentId, currentPlayerId, currentBid, leadingTeam, bidsHistory } });
  }, [currentPlayerId, currentBid, leadingTeam, bidsHistory, activeTournamentId, dataReady, liveReady, loadedLiveTournamentId]);

  useEffect(() => {
    if (dataReady && tournaments.some(t => t.id === tournament.id)) dbService.queueSync({ tournament });
  }, [tournament, dataReady]);

  useEffect(() => {
    if (dataReady) dbService.queueSync({ teams });
  }, [teams, dataReady]);

  useEffect(() => {
    if (dataReady) dbService.queueSync({ players });
  }, [players, dataReady]);

  useEffect(() => {
    if (dataReady) dbService.queueSync({ rules });
  }, [rules, dataReady]);

  // Real-Time Cross-Device & Cross-Tab Synchronization
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((action: SyncAction) => {
      switch (action.type) {
        case 'BID_PLACED':
          setCurrentBid(action.payload.amount);
          setLeadingTeam(action.payload.team);
          setBidsHistory((prev) => [action.payload.record, ...prev]);
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
                ? { ...p, approvalStatus: 'APPROVED', status: 'AVAILABLE' }
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

  // Place a Bid
  const handlePlaceBid = (team: Team, newAmount: number) => {
    if (!currentPlayer) return;

    setCurrentBid(newAmount);
    setLeadingTeam(team);

    const record: BidRecord = {
      id: `bid-${Date.now()}`,
      playerId: currentPlayer.id,
      teamId: team.id,
      teamName: team.name,
      amount: newAmount,
      timestamp: Date.now(),
    };
    setBidsHistory((prev) => [record, ...prev]);

    syncEngine.broadcast({
      type: 'BID_PLACED',
      payload: { team, amount: newAmount, record },
    });
  };

  // Hammer SOLD
  const handleSold = () => {
    if (!currentPlayer || !leadingTeam || currentBid === 0) return;

    const soldPlayer = currentPlayer;
    const winningTeam = leadingTeam;
    const finalPrice = currentBid;

    // Deduct purse from team
    setTeams((prevTeams) =>
      prevTeams.map((t) => {
        if (t.id === winningTeam.id) {
          return {
            ...t,
            remainingPurse: t.remainingPurse - finalPrice,
          };
        }
        return t;
      })
    );

    // Update player record
    setPlayers((prevPlayers) =>
      prevPlayers.map((p) => {
        if (p.id === soldPlayer.id) {
          return {
            ...p,
            status: 'SOLD',
            soldToTeamId: winningTeam.id,
            soldPrice: finalPrice,
          };
        }
        return p;
      })
    );

    const soldInfo = {
      player: soldPlayer,
      team: winningTeam,
      price: finalPrice,
    };

    setLastSoldInfo(soldInfo);
    setIsSold(true);

    syncEngine.broadcast({
      type: 'HAMMER_SOLD',
      payload: soldInfo,
    });

    // Automatically transition to next available player after 3.8s celebration
    setTimeout(() => {
      setIsSold(false);
      setLastSoldInfo(null);
      setCurrentBid(0);
      setLeadingTeam(null);
      setBidsHistory([]);

      const nextAvail = activePlayers.find(
        (p) => p.id !== soldPlayer.id && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION')
      );
      if (nextAvail) {
        setCurrentPlayerId(nextAvail.id);
        syncEngine.broadcast({
          type: 'SELECT_PLAYER',
          payload: { player: nextAvail },
        });
      }
    }, 3800);
  };

  // Mark UNSOLD
  const handleUnsold = () => {
    if (!currentPlayer) return;

    const unsoldPlayer = currentPlayer;

    setPlayers((prevPlayers) =>
      prevPlayers.map((p) => {
        if (p.id === unsoldPlayer.id) {
          return {
            ...p,
            status: 'UNSOLD',
          };
        }
        return p;
      })
    );

    setIsUnsold(true);

    syncEngine.broadcast({
      type: 'MARK_UNSOLD',
      payload: { player: unsoldPlayer },
    });

    setTimeout(() => {
      setIsUnsold(false);
      setCurrentBid(0);
      setLeadingTeam(null);
      setBidsHistory([]);

      const nextAvail = activePlayers.find(
        (p) => p.id !== unsoldPlayer.id && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION')
      );
      if (nextAvail) {
        setCurrentPlayerId(nextAvail.id);
        syncEngine.broadcast({
          type: 'SELECT_PLAYER',
          payload: { player: nextAvail },
        });
      }
    }, 2800);
  };

  // Undo Bid
  const handleUndoBid = () => {
    if (bidsHistory.length <= 1) {
      setCurrentBid(0);
      setLeadingTeam(null);
      setBidsHistory([]);
      syncEngine.broadcast({
        type: 'UNDO_BID',
        payload: { prevBid: null },
      });
      return;
    }

    const newHistory = bidsHistory.slice(1);
    setBidsHistory(newHistory);
    const prevBid = newHistory[0];
    setCurrentBid(prevBid.amount);
    const prevTeam = teams.find((t) => t.id === prevBid.teamId) || null;
    setLeadingTeam(prevTeam);

    syncEngine.broadcast({
      type: 'UNDO_BID',
      payload: { prevBid },
    });
  };

  // Select Player
  const handleSelectPlayer = (player: Player) => {
    setCurrentPlayerId(player.id);
    setCurrentBid(0);
    setLeadingTeam(null);
    setBidsHistory([]);
    syncEngine.broadcast({
      type: 'SELECT_PLAYER',
      payload: { player },
    });
  };

  // Random Draw
  const handleRandomDraw = () => {
    const unAuctioned = activePlayers.filter(
      (p) => p.status === 'AVAILABLE' || p.status === 'IN_AUCTION'
    );
    if (unAuctioned.length === 0) {
      alert('All players in this tournament pool have been auctioned! Check the Squad Booklet.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * unAuctioned.length);
    handleSelectPlayer(unAuctioned[randomIndex]);
  };

  // Reset Auction for current tournament
  const handleResetAuction = () => {
    setPlayers((prev) =>
      prev.map((p) =>
        (!p.tournamentId || p.tournamentId === tournament.id)
          ? {
              ...p,
              status: 'AVAILABLE',
              soldPrice: undefined,
              soldToTeamId: undefined,
            }
          : p
      )
    );
    setTeams((prev) =>
      prev.map((t) =>
        (!t.tournamentId || t.tournamentId === tournament.id)
          ? {
              ...t,
              remainingPurse: t.totalPurse,
            }
          : t
      )
    );
    setCurrentBid(0);
    setLeadingTeam(null);
    setBidsHistory([]);
    if (activePlayers[0]) {
      setCurrentPlayerId(activePlayers[0].id);
    }
  };

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
      customFields: data.customFields || initialTournament.customFields,
    };

    setTournaments((prev) => [newTourney, ...prev]);
    setActiveTournamentId(newTourney.id);
    setViewMode('TOURNAMENT_OVERVIEW');

    syncEngine.broadcast({
      type: 'TOURNAMENT_CREATED',
      payload: { tournament: newTourney },
    });
  };

  const handleUpdateTournament = (updated: Tournament) => {
    setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    syncEngine.broadcast({
      type: 'TOURNAMENT_UPDATED',
      payload: { tournament: updated },
    });
  };

  const handleDeleteTournament = (tourneyId: string) => {
    if (tournaments.length <= 1) {
      alert('Cannot delete the only tournament. At least one tournament is required.');
      return;
    }
    const remaining = tournaments.filter((t) => t.id !== tourneyId);
    setTournaments(remaining);
    if (activeTournamentId === tourneyId) {
      setActiveTournamentId(remaining[0].id);
    }
    dbService.flushSync().then(() => fetch(`/api/tournaments/${encodeURIComponent(tourneyId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  };

  const handleSelectTournament = (tourneyId: string) => {
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
      tournamentId: tournament.id,
    };
    setTeams((prev) => [...prev, teamWithTourney]);
  };

  const handleUpdateTeam = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    dbService.flushSync().then(() => fetch(`/api/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  };

  // Player Management Handlers
  const handleAddPlayer = (newPlayer: Player) => {
    const playerWithTourney: Player = {
      ...newPlayer,
      tournamentId: tournament.id,
    };
    setPlayers((prev) => [...prev, playerWithTourney]);
  };

  const handleBulkAddPlayers = (newPlayers: Player[]) => {
    const mapped = newPlayers.map((p) => ({
      ...p,
      tournamentId: tournament.id,
    }));
    setPlayers((prev) => [...prev, ...mapped]);
  };

  const handleLaunchAcceleratedRound = (discountPercent: number) => {
    const unsold = players.filter((p) => p.status === 'UNSOLD');
    if (unsold.length === 0) {
      alert('No unsold players available for Accelerated Round.');
      return;
    }

    const updatedPlayers = players.map((p) => {
      if (p.status === 'UNSOLD') {
        const discountedPrice =
          discountPercent > 0
            ? Math.max(1000, Math.round(p.basePrice * (1 - discountPercent / 100)))
            : p.basePrice;
        return {
          ...p,
          status: 'AVAILABLE' as const,
          basePrice: discountedPrice,
          category: 'ACCELERATED' as const,
        };
      }
      return p;
    });

    setPlayers(updatedPlayers);
    syncEngine.broadcast({
      type: 'PLAYERS_UPDATED',
      payload: { players: updatedPlayers },
    });

    const firstRecall = updatedPlayers.find((p) => p.id === unsold[0].id);
    if (firstRecall) {
      handleSelectPlayer(firstRecall);
    }

    alert(
      `⚡ Accelerated Round Launched!\n${unsold.length} unsold players recalled to auction lot with ${discountPercent}% price discount.`
    );
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    dbService.flushSync().then(() => fetch(`/api/players/${encodeURIComponent(playerId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  };

  const handleApprovePlayer = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, approvalStatus: 'APPROVED', status: 'AVAILABLE' }
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

  const handleEraseAllDemoData = () => {
    if (
      confirm(
        '⚠️ Are you sure you want to erase all demo data and start a clean live tournament? This will reset all players, bids, and team purses.'
      )
    ) {
      localStorage.removeItem('cap_players');
      localStorage.removeItem('cap_bids');
      setPlayers([]);
      setTeams((prev) =>
        prev.map((t) => ({
          ...t,
          remainingPurse: t.totalPurse,
        }))
      );
      setCurrentPlayerId('');
      setCurrentBid(0);
      setLeadingTeam(null);
      setBidsHistory([]);
      syncEngine.broadcast({
        type: 'CLEAR_ALL_DATA',
      });
      alert('✨ All demo data erased! Your system is now 100% fresh and ready for the live auction.');
    }
  };

  // Dedicated clean view for public player registration (?mode=register)
  if (viewMode === 'PUBLIC_REGISTER') {
    if (!publicTournament) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">{dataError || 'Loading tournament…'}</main>;
    return (
      <PublicRegistrationView
        tournament={publicTournament}
        onRegisterPlayer={handleRegisterPlayer}
        onBackToDashboard={() => setViewMode('TOURNAMENT_OVERVIEW')}
      />
    );
  }

  if (viewMode === 'PUBLIC_SUMMARY' && new URLSearchParams(window.location.search).has('tournamentId')) {
    if (!publicSummary) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">{dataError || 'Loading tournament…'}</main>;
    return <PublicSpectatorView tournament={publicSummary.tournament} teams={publicSummary.teams} players={publicSummary.players} />;
  }
  if (!authChecked) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">Loading…</main>;
  if (!currentUser) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center"><div className="text-center"><h1 className="text-3xl font-bold text-amber-300 mb-5">Cricket Auction Pro</h1><button onClick={() => setIsAuthModalOpen(true)} className="rounded-xl bg-amber-400 text-slate-950 px-8 py-3 font-bold">Organizer sign in or register</button></div><AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleLoginSuccess} /></main>;
  if (!dataReady) return <main className="min-h-screen bg-obsidian-950 text-white grid place-items-center">{dataError || 'Loading your tournaments…'}</main>;

  if (currentUser.role === 'ADMIN') return <AdminPanelView
    currentUser={currentUser}
    tournaments={tournaments}
    onSelectTournament={(t) => window.open(`/?mode=summary&tournamentId=${encodeURIComponent(t.id)}`, '_blank', 'noopener,noreferrer')}
    onBackToApp={handleLogout}
    onRefreshData={() => dbService.fetchBootstrapData().then((data) => { if (data?.tournaments) setTournaments(data.tournaments); })}
  />;

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
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentMode={viewMode}
        onSelectMode={setViewMode}
        tournament={tournament}
        tournaments={visibleTournaments}
        onSelectTournament={handleSelectTournament}
        onCreateNewTournament={() => {
          setEditingTournamentData(null);
          setIsTournamentModalOpen(true);
        }}
        onOpenDatabaseModal={() => setIsDbModalOpen(true)}
        onEraseDemoData={handleEraseAllDemoData}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenFortuneWheel={() => setIsFortuneWheelOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {viewMode === 'TOURNAMENT_OVERVIEW' && (
          <TournamentDashboardView
            tournament={tournament}
            allTournaments={visibleTournaments}
            teams={activeTeams}
            players={activePlayers}
            onSelectViewMode={setViewMode}
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
            tournamentId={tournament.id}
            players={activePlayers}
            onAddPlayer={handleAddPlayer}
            onBulkAddPlayers={handleBulkAddPlayers}
            onDeletePlayer={handleDeletePlayer}
            onNavigateToFormBuilder={() => setViewMode('FORM_BUILDER')}
            onApprovePlayer={handleApprovePlayer}
            onRejectPlayer={handleRejectPlayer}
          />
        )}

        {viewMode === 'FORM_BUILDER' && (
          <RegistrationFormBuilder
            tournament={tournament}
            onUpdateTournament={handleUpdateTournament}
            onPreviewPublicForm={() => setViewMode('PUBLIC_REGISTER')}
          />
        )}

        {viewMode === 'TEAMS' && (
          <TeamsManagerView
            teams={activeTeams}
            tournament={tournament}
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
            rules={rules}
            onUpdateRules={setRules}
            onResetAuction={handleResetAuction}
          />
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
        onEraseDemoData={handleEraseAllDemoData}
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
