import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, Copy, ListChecks, Maximize2, Timer } from 'lucide-react';
import { AuctionRules, BidRecord, CurrencyType, Player, Team } from '../types';
import { sounds } from '../soundEffects';
import { formatAuctionPrice } from '../utils/currency';
import { copyText, publicLink } from '../ui/kit';
import { PlayerAuctionHistory } from './PlayerAuctionHistory';
import { PlayerCard3D } from './PlayerCard3D';
import { StageAuctionSummary } from './StageAuctionSummary';
import { StageBidControls } from './StageBidControls';
import { TeamLogo } from './TeamLogo';

interface StageViewProps {
  tournamentName?: string;
  tournamentId?: string;
  timerSeconds?: number;
  currency?: CurrencyType;
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  bidsHistory: BidRecord[];
  allTeams: Team[];
  isSold: boolean;
  unsoldPlayer: Player | null;
  lastSoldInfo: { player: Player; team: Team; price: number } | null;
  onSelectPlayer?: (player: Player) => void;
  onNextPlayer?: () => void;
  allPlayers?: Player[];
  rules?: AuctionRules;
  auctionBusy?: boolean;
  onPlaceBid?: (team: Team, amount: number) => void;
  onSold?: () => void;
  onUnsold?: () => void;
  onUndoBid?: () => void;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const StageView: React.FC<StageViewProps> = ({
  tournamentName = 'Live Auction', tournamentId, timerSeconds = 15, currency = 'INR', currentPlayer, currentBid, leadingTeam, bidsHistory, allTeams,
  isSold, unsoldPlayer, lastSoldInfo, allPlayers = [], rules, auctionBusy = false, onPlaceBid, onSold, onUnsold, onUndoBid, onNextPlayer, onSelectPlayer,
}) => {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [running, setRunning] = useState(false);
  const isUnsold = Boolean(unsoldPlayer);
  const price = (value: number) => formatAuctionPrice(value, currency);

  useEffect(() => { setTimeLeft(timerSeconds); setRunning(false); }, [currentPlayer?.id, timerSeconds]);
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) { setRunning(false); return; }
    const timeout = window.setTimeout(() => {
      if (timeLeft <= 4 && timeLeft > 1) sounds.playTick();
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [running, timeLeft]);
  // Every new bid restarts the clock.
  useEffect(() => {
    if (currentBid > 0 && !isSold && !isUnsold) { setTimeLeft(timerSeconds); setRunning(true); }
    if (currentBid === 0) { setTimeLeft(timerSeconds); setRunning(false); }
  }, [currentBid, isSold, isUnsold, timerSeconds]);

  useEffect(() => {
    if (!isSold || !lastSoldInfo) return;
    sounds.playSoldFanfare();
    const end = Date.now() + 2600;
    const colors = [lastSoldInfo.team.colorHex || '#C8F31D', '#C8F31D', '#FFFFFF'];
    let frameId = 0;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors, disableForReducedMotion: true });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors, disableForReducedMotion: true });
      if (Date.now() < end) frameId = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(frameId);
  }, [isSold, lastSoldInfo]);

  const displayPlayer = isSold && lastSoldInfo ? lastSoldInfo.player : unsoldPlayer ?? currentPlayer;
  const soldCount = allPlayers.filter((p) => p.status === 'SOLD').length;

  if (summaryOpen) return <StageAuctionSummary players={allPlayers} teams={allTeams} tournamentName={tournamentName} currency={currency} onBack={() => setSummaryOpen(false)} />;

  const controls = rules && onPlaceBid ? <StageBidControls key={tournamentId} tournamentId={tournamentId} onSelectPlayer={onSelectPlayer} teams={allTeams} players={allPlayers} rules={rules} currentPlayer={currentPlayer} currentBid={currentBid} leadingTeam={leadingTeam} busy={auctionBusy || isSold || isUnsold} onBid={onPlaceBid} onSold={onSold} onUnsold={onUnsold} onUndo={onUndoBid} onNext={onNextPlayer} /> : null;

  const toolbar = <div className="stage-share flex flex-wrap items-center justify-end gap-2">
    <button onClick={() => setSummaryOpen(true)} className="btn btn-ghost"><ListChecks className="w-4 h-4" />{soldCount}/{allPlayers.length} sold</button>
    {tournamentId && <button onClick={async () => { if (await copyText(publicLink('summary', tournamentId), 'Public live link copied')) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } }} className="btn btn-ghost">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}Public link</button>}
    <button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); }} className="btn btn-primary"><Maximize2 className="w-4 h-4" />Full screen</button>
  </div>;

  if (!displayPlayer) {
    return <div className="auction-stage">
      {toolbar}
      <div className="stage-main panel pitch-stripes min-h-[40vh] grid place-items-center p-8 text-center">
        <div>
          <p className="text-sm font-extrabold text-gold-400">{tournamentName}</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-black leading-tight text-white">Next lot<br />coming up</h1>
        </div>
      </div>
      {controls}
    </div>;
  }

  const urgent = running && timeLeft <= 5;
  return (
    <div className="auction-stage relative">
      {toolbar}
      <div className="stage-main panel pitch-stripes overflow-hidden grid lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <div className="stage-grid min-h-0 p-4 sm:p-6 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-white/10">
          <PlayerCard3D player={displayPlayer} showUnsold={isUnsold && !isSold} isBigStage />
        </div>
        <div className="flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
            <span className="inline-flex items-center gap-2 text-sm font-extrabold text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />Live<span className="hidden sm:inline text-slate-400 normal-case font-semibold tracking-normal truncate">· {tournamentName}</span></span>
            <span role="timer" aria-label="Time left" className={`inline-flex items-center gap-2 score text-4xl leading-tight ${urgent ? 'text-red-400' : 'text-white'}`}><Timer className="w-6 h-6" />{clock(timeLeft)}</span>
          </div>

          <div className="relative flex-1 p-5 sm:p-8 flex flex-col justify-center min-h-0 overflow-hidden transition-colors duration-300" style={leadingTeam ? { backgroundColor: `${leadingTeam.colorHex}26` } : undefined}>
            <p className="text-sm font-extrabold text-slate-300">{currentBid > 0 ? 'Highest bid' : 'Base price'}</p>
            <p key={currentBid} className="cap-bid score leading-tight text-white text-[clamp(2.75rem,5.5vw,5.5rem)] truncate">{price(currentBid > 0 ? currentBid : displayPlayer.basePrice)}</p>
            {leadingTeam
              ? <div className="mt-4 flex items-center gap-4 min-w-0">
                <span className="w-16 h-16 shrink-0 rounded-xl bg-obsidian-950/70 p-1.5 grid place-items-center overflow-hidden"><TeamLogo logo={leadingTeam.logo} name={leadingTeam.name} className="w-full h-full text-4xl" /></span>
                <div className="min-w-0">
                  <p className="font-display text-4xl sm:text-5xl font-extrabold leading-tight text-white truncate">{leadingTeam.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">Purse left {price(leadingTeam.remainingPurse)}</p>
                </div>
              </div>
              : <p className="mt-4 font-display text-3xl font-extrabold text-slate-400">Waiting for first bid</p>}
            <div className="mt-3"><PlayerAuctionHistory tournamentId={tournamentId} playerId={displayPlayer.id} /></div>
          </div>

          {bidsHistory.length > 0 && <ol aria-label="Recent bids" className="flex gap-2 overflow-x-auto cap-scroll-hide border-t border-white/10 px-5 py-3">
            {bidsHistory.slice(0, 6).map((bid, index) => <li key={bid.id} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${index === 0 ? 'bg-white text-black' : 'bg-white/5 text-slate-300'}`}>{bid.teamName} · {price(bid.amount)}</li>)}
          </ol>}
        </div>
      </div>
      {controls}

      {isSold && lastSoldInfo && <div className="fixed inset-0 z-50 grid place-items-center p-6 text-center backdrop-blur-sm" style={{ backgroundColor: `${lastSoldInfo.team.colorHex}E6` }}>
        <div>
          <p className="cap-stamp inline-block rounded-2xl border-[6px] border-white px-8 py-2 font-display text-[clamp(2.75rem,7vw,6.5rem)] font-black uppercase leading-tight text-white">Sold</p>
          <h2 className="mt-6 font-display text-[clamp(1.75rem,3.5vw,3.5rem)] font-extrabold leading-tight text-white">{lastSoldInfo.player.name}</h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <TeamLogo logo={lastSoldInfo.team.logo} name={lastSoldInfo.team.name} className="w-14 h-14 text-4xl" />
            <span className="font-display text-4xl font-extrabold text-white">{lastSoldInfo.team.name}</span>
          </div>
          <p className="score mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] leading-tight text-white">{price(lastSoldInfo.price)}</p>
        </div>
      </div>}

    </div>
  );
};
