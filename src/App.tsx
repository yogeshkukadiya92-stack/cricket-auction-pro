import React, { useState, useEffect } from 'react';
import {
  initialTournament,
  initialTournaments,
  initialRules,
  initialTeams,
  initialPlayers,
} from './mockData';
import {
  Tournament,
  AuctionRules,
  Team,
  Player,
  BidRecord,
  ViewMode,
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
import { syncEngine, SyncAction } from './utils/syncEngine';
import { dbService } from './services/dbService';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { ArrowLeft } from 'lucide-react';

export function App() {
  // SQLite Database status modal state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Multiple Tournaments state
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('cap_tournaments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const single = localStorage.getItem('cap_tournament');
    if (single) {
      try {
        const parsed = JSON.parse(single);
        return [parsed];
      } catch {}
    }
    return initialTournaments;
  });

  const [activeTournamentId, setActiveTournamentId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTourneyId = params.get('tournamentId');
      if (urlTourneyId) return urlTourneyId;
    }
    const saved = localStorage.getItem('cap_active_tournament_id');
    return saved || initialTournaments[0].id;
  });

  const tournament =
    tournaments.find((t) => t.id === activeTournamentId) ||
    tournaments[0] ||
    initialTournament;

  // Tournament Create / Edit Modal State
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournamentData, setEditingTournamentData] = useState<Tournament | null>(null);

  const [rules, setRules] = useState<AuctionRules>(() => {
    const saved = localStorage.getItem('cap_rules');
    return saved ? JSON.parse(saved) : initialRules;
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('cap_teams');
    return saved ? JSON.parse(saved) : initialTeams;
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('cap_players');
    if (saved) {
      try {
        const parsed: Player[] = JSON.parse(saved);
        const isOldDemo =
          parsed.length > 0 &&
          parsed.every(
            (p) => p.id.startsWith('ply-') && Number(p.id.replace('ply-', '')) <= 14
          );
        if (isOldDemo) {
          localStorage.removeItem('cap_players');
          return [];
        }
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  // Check URL params (?mode=obs for OBS, ?mode=register for public player form)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'obs') return 'OBS';
      if (params.get('mode') === 'register' || params.get('mode') === 'form') {
        return 'PUBLIC_REGISTER';
      }
    }
    return 'TOURNAMENT_OVERVIEW';
  });

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

  // Bootstrap data from SQLite Server Database on startup
  useEffect(() => {
    dbService.fetchBootstrapData().then((data) => {
      if (data && data.success) {
        if (Array.isArray(data.tournaments) && data.tournaments.length > 0) {
          setTournaments(data.tournaments);
        } else {
          dbService.queueSync({ tournaments });
        }

        if (Array.isArray(data.teams) && data.teams.length > 0) {
          setTeams(data.teams);
        } else {
          dbService.queueSync({ teams });
        }

        if (Array.isArray(data.players) && data.players.length > 0) {
          setPlayers(data.players);
        }

        if (data.rules) {
          setRules(data.rules);
        } else {
          dbService.queueSync({ rules });
        }

        if (data.liveState) {
          if (data.liveState.currentPlayerId) setCurrentPlayerId(data.liveState.currentPlayerId);
          if (data.liveState.currentBid) setCurrentBid(data.liveState.currentBid);
          if (data.liveState.leadingTeam) setLeadingTeam(data.liveState.leadingTeam);
          if (data.liveState.bidsHistory) setBidsHistory(data.liveState.bidsHistory);
        }
      }
    });
  }, []);

  // Sync Tournaments & Data to LocalStorage & SQLite
  useEffect(() => {
    localStorage.setItem('cap_tournaments', JSON.stringify(tournaments));
    dbService.queueSync({ tournaments });
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem('cap_active_tournament_id', activeTournamentId);
  }, [activeTournamentId]);

  useEffect(() => {
    localStorage.setItem('cap_tournament', JSON.stringify(tournament));
    dbService.queueSync({ tournament });
  }, [tournament]);

  useEffect(() => {
    localStorage.setItem('cap_teams', JSON.stringify(teams));
    dbService.queueSync({ teams });
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('cap_players', JSON.stringify(players));
    dbService.queueSync({ players });
  }, [players]);

  useEffect(() => {
    localStorage.setItem('cap_rules', JSON.stringify(rules));
    dbService.queueSync({ rules });
  }, [rules]);

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
      registrationFee: data.registrationFee || 500,
      registrationDeadline: data.registrationDeadline || '',
      upiId: data.upiId || '',
      gpayNumber: data.gpayNumber || '',
      gpayName: data.gpayName || '',
      paymentMandatory: true,
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

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
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

  const handleRegisterPlayer = (newPlayer: Player) => {
    const playerWithTourney: Player = {
      ...newPlayer,
      tournamentId: tournament.id,
    };
    setPlayers((prev) => [playerWithTourney, ...prev]);
    syncEngine.broadcast({
      type: 'PLAYER_REGISTERED',
      payload: { player: playerWithTourney },
    });
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
    return (
      <PublicRegistrationView
        tournament={tournament}
        onRegisterPlayer={handleRegisterPlayer}
        onBackToDashboard={() => setViewMode('TOURNAMENT_OVERVIEW')}
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
        tournaments={tournaments}
        onSelectTournament={handleSelectTournament}
        onCreateNewTournament={() => {
          setEditingTournamentData(null);
          setIsTournamentModalOpen(true);
        }}
        onOpenDatabaseModal={() => setIsDbModalOpen(true)}
        onEraseDemoData={handleEraseAllDemoData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {viewMode === 'TOURNAMENT_OVERVIEW' && (
          <TournamentDashboardView
            tournament={tournament}
            allTournaments={tournaments}
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
          />
        )}

        {viewMode === 'TOURNAMENTS' && (
          <TournamentsListView
            tournaments={tournaments}
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

      {/* Footer Branding */}
      <footer className="p-4 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        Cricket Auction Pro 2026 • Designed with Ultra-Luxury IPL Broadcast Experience
      </footer>
    </div>
  );
}

export default App;
