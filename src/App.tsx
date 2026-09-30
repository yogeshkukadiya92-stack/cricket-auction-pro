import React, { useState, useEffect } from 'react';
import {
  initialTournament,
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
import { ArrowLeft } from 'lucide-react';

export function App() {
  // Persistence with LocalStorage
  const [tournament, setTournament] = useState<Tournament>(() => {
    const saved = localStorage.getItem('cap_tournament');
    return saved ? JSON.parse(saved) : initialTournament;
  });

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
        // If cached players only have the old demo players (ply-1 to ply-14), auto-erase them for fresh live setup!
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
    return 'STAGE';
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

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('cap_tournament', JSON.stringify(tournament));
  }, [tournament]);

  useEffect(() => {
    localStorage.setItem('cap_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('cap_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('cap_rules', JSON.stringify(rules));
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

  const currentPlayer = players.find((p) => p.id === currentPlayerId) || null;

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

    // Broadcast live across all browser windows
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

      const nextAvail = players.find(
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

      const nextAvail = players.find(
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
    const unAuctioned = players.filter((p) => p.status === 'AVAILABLE' || p.status === 'IN_AUCTION');
    if (unAuctioned.length === 0) {
      alert('All players have been auctioned! Check the Squad Booklet.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * unAuctioned.length);
    handleSelectPlayer(unAuctioned[randomIndex]);
  };

  // Reset Auction
  const handleResetAuction = () => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        status: 'AVAILABLE',
        soldPrice: undefined,
        soldToTeamId: undefined,
      }))
    );
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        remainingPurse: t.totalPurse,
      }))
    );
    setCurrentBid(0);
    setLeadingTeam(null);
    setBidsHistory([]);
    if (players[0]) {
      setCurrentPlayerId(players[0].id);
    }
  };

  // Team Management Handlers
  const handleAddTeam = (newTeam: Team) => {
    setTeams((prev) => [...prev, newTeam]);
  };

  const handleUpdateTeam = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  // Player Management Handlers
  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers((prev) => [...prev, newPlayer]);
  };

  const handleBulkAddPlayers = (newPlayers: Player[]) => {
    setPlayers((prev) => [...prev, ...newPlayers]);
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
    setPlayers((prev) => [newPlayer, ...prev]);
    syncEngine.broadcast({
      type: 'PLAYER_REGISTERED',
      payload: { player: newPlayer },
    });
  };

  const handleEraseAllDemoData = () => {
    if (
      confirm(
        '⚠️ શું તમે ખરેખર બધા જ ડેમો પ્લેયર્સ અને ટેસ્ટ ડેટા સાફ કરીને નવું લાઈવ ઓક્શન શરૂ કરવા માંગો છો? (Are you sure you want to erase all demo data and start a clean live tournament?)'
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
      alert('✨ બધા જ ડેમો ડેટા ભૂંસી નાખ્યા છે! તમારી સિસ્ટમ હવે ૧૦૦% ફ્રેશ અને લાઈવ ઓક્શન માટે તૈયાર છે.');
    }
  };

  // Dedicated clean view for public player registration (?mode=register)
  if (viewMode === 'PUBLIC_REGISTER') {
    return (
      <PublicRegistrationView
        tournament={tournament}
        onRegisterPlayer={handleRegisterPlayer}
        onBackToDashboard={() => setViewMode('STAGE')}
      />
    );
  }

  // Special full-screen transparent view for OBS Studio
  if (viewMode === 'OBS') {
    return (
      <div className="relative min-h-screen bg-transparent">
        {/* Floating Back to App Button */}
        <button
          onClick={() => setViewMode('STAGE')}
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
        onEraseDemoData={handleEraseAllDemoData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {viewMode === 'STAGE' && (
          <StageView
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            leadingTeam={leadingTeam}
            bidsHistory={bidsHistory}
            allTeams={teams}
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
            allTeams={teams}
            allPlayers={players}
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
            allTeams={teams}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            leadingTeam={leadingTeam}
            allPlayers={players}
            rules={rules}
            onPlaceBid={handlePlaceBid}
          />
        )}

        {viewMode === 'PLAYERS' && (
          <PlayerManagerView
            players={players}
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
            onUpdateTournament={setTournament}
            onPreviewPublicForm={() => setViewMode('PUBLIC_REGISTER')}
          />
        )}

        {viewMode === 'TEAMS' && (
          <TeamsManagerView
            teams={teams}
            tournament={tournament}
            onAddTeam={handleAddTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            onUpdateTournament={setTournament}
          />
        )}

        {viewMode === 'SQUADS' && (
          <SquadSummaryView
            teams={teams}
            players={players}
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

      {/* Footer Branding */}
      <footer className="p-4 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        Cricket Auction Pro 2026 • Designed with Ultra-Luxury IPL Broadcast Experience
      </footer>
    </div>
  );
}

export default App;
