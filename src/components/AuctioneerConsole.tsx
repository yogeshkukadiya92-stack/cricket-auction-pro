import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Check, Gavel, Keyboard, ListOrdered, Search, Shield, Shuffle, Sparkles, Undo2, Users, X, Zap } from 'lucide-react';
import { getBidBudget, withSlotReserve } from '../../shared/auctionBudget.js';
import { AuctionRules, Player, Team } from '../types';
import { sounds } from '../soundEffects';
import { formatAuctionPrice } from '../utils/currency';
import { ask, Empty, Hint, notify } from '../ui/kit';
import { PlayerAuctionHistory } from './PlayerAuctionHistory';
import { TeamLogo } from './TeamLogo';

interface AuctioneerConsoleProps {
  currentPlayer: Player | null;
  currentBid: number;
  leadingTeam: Team | null;
  allTeams: Team[];
  allPlayers: Player[];
  rules: AuctionRules;
  busy?: boolean;
  isSold?: boolean;
  isUnsold?: boolean;
  lastSoldInfo?: { player: Player; team: Team; price: number } | null;
  onPlaceBid: (team: Team, newAmount: number) => void;
  onSold: () => void;
  onUnsold: () => void;
  onUndoBid: () => void;
  onSelectPlayer: (player: Player) => void;
  onRandomDraw: () => void;
  onOpenFortuneWheel?: () => void;
  onLaunchAcceleratedRound?: (discountPercent: number) => void;
  onOpenPlayers?: () => void;
  onOpenTeams?: () => void;
}

const roleName: Record<string, string> = { BATSMAN: 'Batsman', BOWLER: 'Bowler', ALL_ROUNDER: 'All-rounder', WICKET_KEEPER: 'Keeper' };

export const AuctioneerConsole: React.FC<AuctioneerConsoleProps> = ({
  currentPlayer, currentBid, leadingTeam, allTeams, allPlayers, rules, busy = false, isSold, isUnsold, lastSoldInfo,
  onPlaceBid, onSold, onUnsold, onUndoBid, onSelectPlayer, onRandomDraw, onOpenFortuneWheel, onLaunchAcceleratedRound, onOpenPlayers, onOpenTeams,
}) => {
  const baseStep = rules.bidIncrement || currentPlayer?.basePrice || 20000;
  const [multiplier, setMultiplier] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const [roundOpen, setRoundOpen] = useState(false);

  const price = (value: number) => formatAuctionPrice(value, rules.currency);
  const available = useMemo(() => allPlayers.filter((p) => (!p.approvalStatus || p.approvalStatus === 'APPROVED') && (p.status === 'AVAILABLE' || p.status === 'IN_AUCTION')).sort((a, b) => (a.lotOrder || 0) - (b.lotOrder || 0)), [allPlayers]);
  const unsoldCount = allPlayers.filter((p) => p.status === 'UNSOLD').length;
  const soldCount = allPlayers.filter((p) => p.status === 'SOLD').length;

  useEffect(() => { setMultiplier(1); setCustom(''); setCustomOpen(false); }, [currentPlayer?.id]);

  const customAmount = customOpen && custom ? Number(custom) : 0;
  const nextBid = customOpen ? customAmount : currentBid > 0 ? currentBid + baseStep * multiplier : currentPlayer?.basePrice || 0;
  const hasBid = currentBid > 0 && !!leadingTeam;
  const locked = busy || !!isSold || !!isUnsold;

  const budgetRules = withSlotReserve(rules, currentPlayer?.basePrice);
  const highestMax = allTeams.reduce((max, team) => { const b = getBidBudget(team, allPlayers, budgetRules); return b.squadComplete ? max : Math.max(max, b.maxBid); }, 0);
  const maxReached = !!currentPlayer && currentBid > 0 && nextBid > highestMax;
  const blockReason = (team: Team) => {
    const budget = getBidBudget(team, allPlayers, budgetRules);
    if (leadingTeam?.id === team.id) return 'Leading';
    if (budget.squadComplete) return 'Squad full';
    if (nextBid > budget.maxBid) return 'Over limit';
    return '';
  };

  const bid = (team: Team) => {
    if (!currentPlayer || locked) return;
    if (customOpen && !custom.trim()) { notify('Enter a custom bid amount.', 'warn'); return; }
    if (!Number.isFinite(nextBid) || nextBid < currentPlayer.basePrice || nextBid <= currentBid) {
      notify(`Bid must be above ${price(Math.max(currentBid, currentPlayer.basePrice - 1))}.`, 'warn');
      return;
    }
    const reason = blockReason(team);
    if (reason === 'Over limit') { ask({ title: 'Maximum bid reached', body: `${team.name} has reached its maximum bid of ${price(getBidBudget(team, allPlayers, budgetRules).maxBid)}. No more bids can be placed for this team.`, confirmLabel: 'OK' }); return; }
    if (reason) return;
    sounds.playBidSound();
    onPlaceBid(team, nextBid);
    setCustom(''); setCustomOpen(false);
  };
  const sell = () => { if (!hasBid || locked) return; sounds.playGavel(); onSold(); };
  const pass = async () => {
    if (!currentPlayer || locked) return;
    if (currentBid > 0 && !await ask({ title: 'Mark unsold?', body: 'The current bids will be discarded.', confirmLabel: 'Mark unsold', danger: true })) return;
    sounds.playUnsoldBuzzer();
    onUnsold();
  };

  // One-key operation for a fast live desk. Bids are direct; selling asks first.
  useEffect(() => {
    const onKey = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.repeat || event.isComposing || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey || queueOpen || roundOpen || document.querySelector('[aria-modal="true"], [role="alertdialog"]') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (/^[1-9]$/.test(key)) { const team = allTeams[Number(key) - 1]; if (team) bid(team); }
      else if (key === 'z' && currentBid > 0 && !locked) onUndoBid();
      else if (key === 'n' && currentBid === 0 && !locked) onRandomDraw();
      else if (key === 'u') void pass();
      else if (key === 's' && hasBid && !locked && await ask({ title: `Sell to ${leadingTeam?.name}?`, body: price(currentBid), confirmLabel: 'Sold' })) sell();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (allTeams.length === 0 || allPlayers.length === 0) {
    return <Empty icon={allTeams.length === 0 ? Shield : Users} title={allTeams.length === 0 ? 'Add teams to start' : 'Add players to start'} actions={
      <button className="btn btn-primary" onClick={allTeams.length === 0 ? onOpenTeams : onOpenPlayers}>{allTeams.length === 0 ? 'Add teams' : 'Add players'}</button>
    } />;
  }

  return (
    <div className="space-y-4 pb-32 md:pb-24">
      {/* Progress and lot selection */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-300"><span className="text-white">{soldCount}</span> sold · <span className="text-white">{available.length}</span> waiting · <span className="text-white">{unsoldCount}</span> unsold</p>
        <div className="flex flex-wrap items-center gap-2">
          <Hint label="Keyboard shortcuts" text={<span className="flex items-start gap-2"><Keyboard className="w-4 h-4 shrink-0" /><span>1–9 bid for team · S sold · U unsold · Z undo · N next player</span></span>} />
          {onOpenFortuneWheel && <button onClick={onOpenFortuneWheel} disabled={locked || currentBid > 0} className="btn btn-ghost"><Sparkles className="w-4 h-4" />Wheel</button>}
          {onLaunchAcceleratedRound && unsoldCount > 0 && <button onClick={() => setRoundOpen(true)} disabled={locked || currentBid > 0} className="btn btn-ghost"><Zap className="w-4 h-4" />Unsold round ({unsoldCount})</button>}
          <button onClick={() => setQueueOpen(true)} disabled={locked || currentBid > 0} className="btn btn-ghost"><ListOrdered className="w-4 h-4" />Pick player</button>
        </div>
      </div>

      {isSold && lastSoldInfo && <div role="status" className="cap-rise rounded-2xl bg-emerald-500 px-4 py-3 text-black font-extrabold flex items-center gap-2"><Check className="w-5 h-5" />{lastSoldInfo.player.name} sold to {lastSoldInfo.team.name} for {price(lastSoldInfo.price)}</div>}

      {currentPlayer ? <>
        {/* The board */}
        <section className="panel pitch-stripes overflow-hidden grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" aria-label="Current lot">
          <div className="flex gap-4 p-4 sm:p-5 min-w-0">
            <img src={currentPlayer.photoUrl || '/player-placeholder.svg'} alt="" className="w-24 h-28 sm:w-32 sm:h-40 shrink-0 rounded-xl object-cover bg-obsidian-950" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-gold-400">Lot {currentPlayer.lotOrder || '–'}{currentPlayer.category === 'MARQUEE' ? ' · Marquee' : currentPlayer.category === 'ACCELERATED' ? ' · Unsold round' : ''}</p>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight text-white break-words">{currentPlayer.name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-300">{roleName[currentPlayer.role] || currentPlayer.role}{currentPlayer.city ? ` · ${currentPlayer.city}` : ''}</p>
              <dl className="mt-2 flex gap-4 text-sm">
                <div><dt className="caption text-[11px] text-slate-400">Runs</dt><dd className="font-bold text-white">{currentPlayer.stats?.runs ?? 0}</dd></div>
                <div><dt className="caption text-[11px] text-slate-400">Wkts</dt><dd className="font-bold text-white">{currentPlayer.stats?.wickets ?? 0}</dd></div>
                <div><dt className="caption text-[11px] text-slate-400">Base</dt><dd className="font-bold text-white">{price(currentPlayer.basePrice)}</dd></div>
              </dl>
            </div>
          </div>
          <div className="relative border-t md:border-t-0 md:border-l border-white/10 p-4 sm:p-5 flex flex-col justify-center min-w-0" style={leadingTeam ? { backgroundColor: `${leadingTeam.colorHex}22` } : undefined}>
            <p className="text-xs font-extrabold text-slate-300">{hasBid ? 'Highest bid' : 'Opening bid'}</p>
            <p key={currentBid} className="cap-bid score text-6xl sm:text-7xl xl:text-8xl leading-tight text-white truncate">{price(hasBid ? currentBid : currentPlayer.basePrice)}</p>
            <div className="mt-2 flex items-center gap-2 min-h-8">
              {leadingTeam ? <><TeamLogo logo={leadingTeam.logo} name={leadingTeam.name} className="w-7 h-7 text-xl" /><span className="font-extrabold text-white truncate">{leadingTeam.name}</span></> : <span className="text-sm font-semibold text-slate-400">No bids yet</span>}
            </div>
            <PlayerAuctionHistory tournamentId={currentPlayer.tournamentId} playerId={currentPlayer.id} />
          </div>
        </section>

        {/* Bid amount */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-300 mr-1">Next bid <strong className="score text-2xl text-gold-400 align-middle ml-1">{price(nextBid)}</strong></span>
          {currentBid > 0 && !customOpen && [1, 2, 5, 10].map((times) => <button key={times} onClick={() => setMultiplier(times)} aria-pressed={multiplier === times} className={`btn min-h-9 px-3 ${multiplier === times ? 'bg-white text-black' : 'btn-ghost'}`}>+{price(baseStep * times)}</button>)}
          {customOpen
            ? <span className="inline-flex items-center gap-1"><input autoFocus type="number" inputMode="numeric" min={Math.max(currentPlayer.basePrice, currentBid + 1)} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Custom bid amount" placeholder="Amount" className="field min-h-9 w-36" /><button aria-label="Close custom amount" onClick={() => { setCustomOpen(false); setCustom(''); }} className="btn-icon"><X className="w-4 h-4" /></button></span>
            : <button onClick={() => setCustomOpen(true)} className="btn btn-ghost min-h-9 px-3">Custom</button>}
        </div>

        <p role="status" className={`text-xs font-bold ${maxReached ? 'text-red-300' : 'text-slate-400'}`}>{maxReached ? 'Maximum bid reached. No more bids can be placed.' : <>Maximum bid <span className="text-white">{price(highestMax)}</span> · {price(budgetRules.minimumPlayerReserve)} kept booked for each remaining squad slot</>}</p>

        {/* Team tiles: one tap places the bid */}
        <section aria-label="Tap a team to bid" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
          {allTeams.map((team, index) => {
            const budget = getBidBudget(team, allPlayers, budgetRules);
            const reason = blockReason(team);
            const leading = reason === 'Leading';
            return <button key={team.id} onClick={() => bid(team)} disabled={locked || (!!reason && reason !== 'Over limit')} aria-label={`Bid ${price(nextBid)} for ${team.name}`}
              className={`relative tile text-left p-3 min-h-[104px] transition-colors enabled:hover:bg-obsidian-800 enabled:active:translate-y-px ${leading ? '!border-gold-400 disabled:opacity-100' : 'disabled:opacity-40'}`}>
              <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: team.colorHex }} />
              <span className="flex items-center gap-2 pl-1.5">
                <TeamLogo logo={team.logo} name={team.name} className="w-8 h-8 text-2xl" />
                <span className="font-display text-2xl font-extrabold leading-tight text-white truncate">{team.shortCode || team.name}</span>
                {index < 9 && <kbd className="hidden lg:block ml-auto caption text-[11px] font-bold text-slate-500">{index + 1}</kbd>}
              </span>
              <span className="mt-2 block pl-1.5 text-xs text-slate-400">Left <strong className="font-bold text-slate-100">{price(team.remainingPurse)}</strong></span>
              <span className="block pl-1.5 text-xs text-slate-400">{reason && !leading ? <strong className="font-bold text-amber-300">{reason}</strong> : leading ? <strong className="font-bold text-gold-400">Leading</strong> : <>Max {price(budget.maxBid)}</>} · {budget.bought}/{rules.maxPlayersPerTeam}</span>
            </button>;
          })}
        </section>
      </> : <div className="panel pitch-stripes p-10 text-center">
        <h1 className="font-display text-5xl font-extrabold text-white">{available.length ? 'Ready for the next lot' : unsoldCount ? 'Main round finished' : 'Auction finished'}</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {available.length > 0 && <>
            <button onClick={() => onSelectPlayer(available[0])} disabled={busy} className="btn btn-primary min-h-12 text-base"><Gavel className="w-5 h-5" />Call lot {available[0].lotOrder || 1}</button>
            <button onClick={onRandomDraw} disabled={busy} className="btn btn-ghost min-h-12"><Shuffle className="w-4 h-4" />Random</button>
          </>}
          {!available.length && unsoldCount > 0 && onLaunchAcceleratedRound && <button onClick={() => setRoundOpen(true)} className="btn btn-primary min-h-12 text-base"><Zap className="w-5 h-5" />Start unsold round</button>}
        </div>
      </div>}

      {/* Always-reachable hammer bar */}
      {currentPlayer && <div className="fixed z-30 inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0 md:left-16 xl:left-56 border-t border-white/10 bg-obsidian-900/95 backdrop-blur-lg p-2.5 sm:p-3">
        <div className="max-w-[1500px] mx-auto grid grid-cols-[1fr_1fr_2.2fr] sm:flex items-stretch gap-2 sm:justify-end">
          <button onClick={onUndoBid} disabled={locked || currentBid <= 0} className="btn btn-ghost min-h-14 sm:px-5"><Undo2 className="w-5 h-5" /><span className="hidden sm:inline">Undo</span><span className="sm:hidden sr-only">Undo</span></button>
          <button onClick={() => void pass()} disabled={locked} className="btn min-h-14 sm:px-5 bg-red-500/15 border border-red-500/40 text-red-200 hover:bg-red-500/25"><Ban className="w-5 h-5" />Unsold</button>
          <button onClick={sell} disabled={locked || !hasBid} className="btn min-h-14 min-w-0 sm:min-w-72 bg-emerald-500 hover:bg-emerald-400 text-black text-lg font-extrabold disabled:bg-white/5 disabled:text-slate-500"><Gavel className="w-5 h-5 shrink-0" /><span className="truncate">SOLD{hasBid ? ` · ${leadingTeam?.shortCode || leadingTeam?.name}` : ''}</span></button>
        </div>
      </div>}

      {queueOpen && <PlayerQueue players={available} current={currentPlayer} price={price} onClose={() => setQueueOpen(false)} onPick={(player) => { setQueueOpen(false); onSelectPlayer(player); }} onRandom={() => { setQueueOpen(false); onRandomDraw(); }} />}
      {roundOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-obsidian-950/85 backdrop-blur-sm p-4" onClick={() => setRoundOpen(false)}>
        <div role="dialog" aria-modal="true" aria-labelledby="round-title" onClick={(e) => e.stopPropagation()} className="cap-rise w-full max-w-sm panel bg-obsidian-850 p-5">
          <h2 id="round-title" className="font-display text-3xl font-extrabold text-white">Unsold round</h2>
          <p className="mt-1 text-sm text-slate-300">{unsoldCount} {unsoldCount === 1 ? 'player returns' : 'players return'}. Choose a base price cut.</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 10, 25, 50].map((percent) => <button key={percent} onClick={() => { setRoundOpen(false); onLaunchAcceleratedRound?.(percent); }} className="btn btn-ghost min-h-14 text-base">{percent === 0 ? 'None' : `−${percent}%`}</button>)}
          </div>
        </div>
      </div>}
    </div>
  );
};

function PlayerQueue({ players, current, price, onClose, onPick, onRandom }: { players: Player[]; current: Player | null; price: (value: number) => string; onClose: () => void; onPick: (player: Player) => void; onRandom: () => void }) {
  const [query, setQuery] = useState('');
  const shown = players.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <div className="fixed inset-0 z-50 flex justify-end bg-obsidian-950/70 backdrop-blur-sm" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-label="Pick player" onClick={(e) => e.stopPropagation()} className="cap-rise w-full max-w-md h-full flex flex-col border-l border-white/10 bg-obsidian-900">
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-extrabold text-white">Pick player <span className="text-slate-500">{players.length}</span></h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1"><span className="sr-only">Search player</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="field pl-9" /></label>
          <button onClick={onRandom} className="btn btn-ghost min-h-11"><Shuffle className="w-4 h-4" />Random</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {shown.map((player) => <button key={player.id} onClick={() => onPick(player)} className={`w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 ${current?.id === player.id ? 'bg-white/5' : ''}`}>
          <span className="w-8 text-center text-xs font-bold text-slate-500">{player.lotOrder}</span>
          <img loading="lazy" src={player.photoUrl || '/player-placeholder.svg'} alt="" className="w-10 h-10 rounded-lg object-cover bg-obsidian-950" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white truncate">{player.name}</span><span className="block text-xs text-slate-400 truncate">{roleName[player.role] || player.role} · {price(player.basePrice)}</span></span>
          {current?.id === player.id && <Check className="w-4 h-4 text-gold-400" />}
        </button>)}
        {!shown.length && <p className="p-8 text-center text-sm text-slate-400">No match</p>}
      </div>
    </aside>
  </div>;
}
