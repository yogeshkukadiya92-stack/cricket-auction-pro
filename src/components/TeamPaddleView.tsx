import React, { useState } from 'react';
import { CheckCircle2, Hand, Shield } from 'lucide-react';
import { getBidBudget, withSlotReserve } from '../../shared/auctionBudget.js';
import { AuctionRules, Player, Team } from '../types';
import { sounds } from '../soundEffects';
import { formatAuctionPrice } from '../utils/currency';
import { Empty, Tile } from '../ui/kit';
import { isImageLogo } from './TeamLogo';
import { PlayerAuctionHistory } from './PlayerAuctionHistory';

interface TeamPaddleViewProps {
  allTeams: Team[];
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  allPlayers: Player[];
  rules: AuctionRules;
  onPlaceBid: (team: Team, amount: number) => void;
  onOpenTeams?: () => void;
}

export const TeamPaddleView: React.FC<TeamPaddleViewProps> = ({ allTeams, currentPlayer, currentBid, leadingTeam, allPlayers, rules, onPlaceBid, onOpenTeams }) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(allTeams[0]?.id || '');
  const team = allTeams.find((t) => t.id === selectedTeamId) || allTeams[0];
  if (!team) return <Empty icon={Shield} title="Add teams first" actions={<button className="btn btn-primary" onClick={onOpenTeams}>Add teams</button>} />;

  const price = (value: number) => formatAuctionPrice(value, rules.currency);
  const squad = allPlayers.filter((p) => p.status === 'SOLD' && p.soldToTeamId === team.id);
  const nextBid = currentBid === 0 ? currentPlayer?.basePrice || 0 : currentBid + (rules.bidIncrement || currentPlayer?.basePrice || 20000);
  const budget = getBidBudget(team, allPlayers, withSlotReserve(rules, currentPlayer?.basePrice));
  const biddable = !!currentPlayer && ['AVAILABLE', 'IN_AUCTION'].includes(currentPlayer.status) && !budget.squadComplete && nextBid <= budget.maxBid;
  const leading = leadingTeam?.id === team.id;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <label className="block">
        <span className="sr-only">Your team</span>
        <select value={team.id} onChange={(e) => setSelectedTeamId(e.target.value)} className="field font-bold">
          {allTeams.map((t) => <option key={t.id} value={t.id}>{isImageLogo(t.logo) ? '' : `${t.logo} `}{t.name}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <Tile small label="Purse" value={price(team.remainingPurse)} />
        <Tile small label="Max bid" value={price(budget.maxBid)} tone="lime" />
        <Tile small label="Squad" value={`${budget.bought}/${rules.maxPlayersPerTeam}`} />
      </div>

      {currentPlayer ? <>
        <section className="panel p-4 flex items-center gap-4" aria-label="Current lot">
          <img src={currentPlayer.photoUrl || '/player-placeholder.svg'} alt="" className="w-20 h-24 rounded-xl object-cover bg-obsidian-950" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white break-words">{currentPlayer.name}</h1>
            <p className="mt-1.5 text-sm text-slate-300">{currentBid > 0 ? <>Highest <strong className="text-white">{price(currentBid)}</strong>{leadingTeam ? ` · ${leadingTeam.shortCode || leadingTeam.name}` : ''}</> : <>Base <strong className="text-white">{price(currentPlayer.basePrice)}</strong></>}</p>
            <PlayerAuctionHistory tournamentId={currentPlayer.tournamentId} playerId={currentPlayer.id} />
          </div>
        </section>

        {leading
          ? <div role="status" className="rounded-3xl border-2 border-gold-400 bg-gold-500/10 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-gold-400" />
            <p className="mt-2 font-display text-4xl font-extrabold text-gold-400">You're leading</p>
          </div>
          : <button disabled={!biddable} onClick={() => { sounds.playBidSound(); onPlaceBid(team, nextBid); }} className="w-full rounded-3xl bg-gold-500 enabled:hover:bg-gold-400 enabled:active:translate-y-px text-black py-10 flex flex-col items-center gap-1 disabled:bg-white/5 disabled:text-slate-500 transition-colors">
            <Hand className="w-9 h-9" />
            <span className="score text-6xl leading-tight">{budget.squadComplete ? 'Squad full' : price(nextBid)}</span>
            <span className="text-sm font-extrabold">{budget.squadComplete ? '' : biddable ? 'Tap to bid' : 'Over your limit'}</span>
          </button>}
      </> : <div className="panel p-10 text-center font-display text-3xl font-extrabold text-slate-400">Waiting for next player</div>}

      {squad.length > 0 && <section aria-labelledby="paddle-squad">
        <h2 id="paddle-squad" className="mb-2 font-display text-2xl font-extrabold text-white">Squad <span className="text-slate-500">{squad.length}</span></h2>
        <div className="panel divide-y divide-white/5 overflow-hidden">
          {squad.map((player) => <div key={player.id} className="flex items-center gap-3 px-3 py-2">
            <img loading="lazy" src={player.photoUrl || '/player-placeholder.svg'} alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{player.name}</span>
            <span className="text-sm font-bold text-slate-200">{price(player.soldPrice || 0)}</span>
          </div>)}
        </div>
      </section>}
    </div>
  );
};
