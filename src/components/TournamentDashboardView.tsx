import React from 'react';
import {
  ArrowRight, Calendar, Check, ClipboardList, Edit3, ExternalLink, Eye, FileSpreadsheet, FileUp, Gavel, MapPin, MessageCircle,
  Radio, Settings, Shield, Sparkles, Tv, Users,
} from 'lucide-react';
import { Player, Team, Tournament, ViewMode } from '../types';
import { formatAuctionPrice } from '../utils/currency';
import { CopyButton, publicLink, Tile } from '../ui/kit';
import { TeamLogo } from './TeamLogo';

interface TournamentDashboardViewProps {
  tournament: Tournament;
  allTournaments?: Tournament[];
  teams: Team[];
  players: Player[];
  auctionLive?: boolean;
  onSelectViewMode: (mode: ViewMode) => void;
  onEditTournament: () => void;
  onCreateNewTournament?: () => void;
  onOpenFortuneWheel?: () => void;
  onOpenBulkUploadModal?: () => void;
}

export const TournamentDashboardView: React.FC<TournamentDashboardViewProps> = ({
  tournament, teams, players, auctionLive, onSelectViewMode, onEditTournament, onOpenFortuneWheel, onOpenBulkUploadModal,
}) => {
  const price = (value: number) => formatAuctionPrice(value, tournament.rules?.currency);
  const sold = players.filter((p) => p.status === 'SOLD');
  const unsold = players.filter((p) => p.status === 'UNSOLD').length;
  const waiting = players.filter((p) => p.status === 'AVAILABLE' || p.status === 'IN_AUCTION' || !p.status).length;
  const spent = sold.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const started = auctionLive || sold.length > 0 || unsold > 0;
  const finished = players.length > 0 && waiting === 0;

  // One obvious next action, worked out from where this tournament stands.
  const next: { label: string; mode: ViewMode; icon: React.ElementType } =
    teams.length < 2 ? { label: 'Add teams', mode: 'TEAMS', icon: Shield }
    : players.length === 0 ? { label: 'Add players', mode: 'PLAYERS', icon: Users }
    : finished ? { label: 'See squads', mode: 'SQUADS', icon: FileSpreadsheet }
    : { label: started ? 'Resume auction' : 'Start auction', mode: 'AUCTIONEER', icon: Gavel };
  const NextIcon = next.icon;

  const steps = [
    { label: 'Teams', detail: `${teams.length}/${tournament.expectedTeamsCount || teams.length || 0}`, done: teams.length >= 2, mode: 'TEAMS' as ViewMode },
    { label: 'Players', detail: String(players.length), done: players.length > 0, mode: 'PLAYERS' as ViewMode },
    { label: 'Rules', detail: tournament.rules ? 'Set' : 'Default', done: !!tournament.rules, mode: 'RULES' as ViewMode },
    { label: 'Auction', detail: finished ? 'Done' : started ? 'Live' : 'Ready', done: finished, mode: 'AUCTIONEER' as ViewMode },
    { label: 'Squads', detail: String(sold.length), done: finished, mode: 'SQUADS' as ViewMode },
  ];

  const shares = [
    { label: 'Sign-up form', icon: ClipboardList, url: publicLink('register', tournament.id), text: `Register for ${tournament.name}` },
    { label: 'Player list', icon: Users, url: publicLink('registrations', tournament.id), text: `Registered players of ${tournament.name}` },
    { label: 'Public live page', icon: Eye, url: publicLink('summary', tournament.id), text: `Watch the ${tournament.name} auction live` },
  ];

  return (
    <div className="space-y-6">
      {/* Identity and next action */}
      <section className="panel pitch-stripes p-5 sm:p-6 flex flex-wrap items-center gap-5">
        <span className="w-20 h-20 shrink-0 rounded-2xl border border-white/10 bg-obsidian-950 p-2 grid place-items-center overflow-hidden">
          <TeamLogo logo={tournament.logoUrl || '🏆'} name={tournament.name} className="w-full h-full text-4xl" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex items-center gap-2">
            {tournament.status === 'LIVE'
              ? <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-0.5 caption text-[11px] font-extrabold text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Live</span>
              : <span className="rounded-md bg-white/10 px-2 py-0.5 caption text-[11px] font-extrabold text-slate-200">{tournament.status === 'UPCOMING' ? 'Upcoming' : 'Finished'}</span>}
            <span className="text-sm font-semibold text-slate-300 truncate">{tournament.season} · {tournament.year}</span>
          </div>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl font-extrabold leading-tight text-white break-words">{tournament.name}</h1>
          {(tournament.ground || tournament.startDate) && <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            {tournament.ground && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{tournament.ground}{tournament.city ? `, ${tournament.city}` : ''}</span>}
            {tournament.startDate && <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{tournament.startDate}{tournament.endDate ? ` – ${tournament.endDate}` : ''}</span>}
          </p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={onEditTournament} className="btn btn-ghost min-h-12"><Edit3 className="w-4 h-4" />Edit</button>
          <button onClick={() => onSelectViewMode(next.mode)} className="btn btn-primary min-h-12 flex-1 sm:flex-none px-6 text-base"><NextIcon className="w-5 h-5" />{next.label}</button>
        </div>
      </section>

      {/* Progress: tap any stage to go there */}
      <nav aria-label="Tournament progress" className="grid grid-cols-5 gap-1.5">
        {steps.map((step, index) => <button key={step.label} onClick={() => onSelectViewMode(step.mode)} className="group min-w-0 text-left">
          <span className={`block h-1.5 rounded-full ${step.done ? 'bg-gold-500' : 'bg-white/10'}`} />
          <span className="mt-2 flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-200 group-hover:text-white truncate">
            {step.done ? <Check className="w-3.5 h-3.5 shrink-0 text-gold-400" /> : <span className="hidden sm:inline text-slate-500">{index + 1}</span>}{step.label}
          </span>
          <span className="block caption text-[11px] sm:text-xs text-slate-400 truncate">{step.detail}</span>
        </button>)}
      </nav>

      {/* Scoreboard */}
      <section aria-label="Auction totals" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Sold" value={sold.length} sub={`of ${players.length} players`} tone="lime" onClick={() => onSelectViewMode('SQUADS')} />
        <Tile label="Waiting" value={waiting} onClick={() => onSelectViewMode('PLAYERS')} />
        <Tile label="Unsold" value={unsold} tone={unsold ? 'red' : 'default'} onClick={() => onSelectViewMode('PLAYERS')} />
        <Tile label="Total spent" value={price(spent)} sub={`Base ${price(tournament.defaultBasePrice || 0)}`} />
      </section>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Teams */}
        <section className="lg:col-span-3 space-y-3" aria-labelledby="hub-teams">
          <div className="flex items-center justify-between">
            <h2 id="hub-teams" className="font-display text-2xl font-extrabold text-white">Team purses</h2>
            <button onClick={() => onSelectViewMode('TEAMS')} className="inline-flex items-center gap-1 min-h-10 text-sm font-bold text-gold-400 hover:text-gold-300">Manage<ArrowRight className="w-4 h-4" /></button>
          </div>
          {teams.length === 0
            ? <button onClick={() => onSelectViewMode('TEAMS')} className="panel w-full p-8 text-center font-bold text-gold-400 hover:bg-obsidian-850">+ Add your first team</button>
            : <div className="panel divide-y divide-white/5 overflow-hidden">
              {teams.map((team) => {
                const left = team.totalPurse > 0 ? Math.max(0, team.remainingPurse / team.totalPurse) : 0;
                const count = sold.filter((p) => p.soldToTeamId === team.id).length;
                return <div key={team.id} className="flex items-center gap-3 px-4 py-3">
                  <TeamLogo logo={team.logo} name={team.name} className="w-9 h-9 text-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-bold text-white truncate">{team.name}</span>
                      <span className="score text-xl text-white shrink-0">{price(team.remainingPurse)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <span className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${left * 100}%`, backgroundColor: team.colorHex }} /></span>
                      <span className="text-xs text-slate-400 shrink-0">{count} players</span>
                    </div>
                  </div>
                </div>;
              })}
            </div>}
        </section>

        <div className="lg:col-span-2 space-y-6">
          {/* Share links */}
          <section className="space-y-3" aria-labelledby="hub-share">
            <h2 id="hub-share" className="font-display text-2xl font-extrabold text-white">Share</h2>
            <div className="panel divide-y divide-white/5 overflow-hidden">
              {shares.map((share) => <div key={share.label} className="flex items-center gap-2 pl-4 pr-2 py-2">
                <share.icon className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{share.label}</span>
                <CopyButton text={share.url} label="Copy" done={`${share.label} link copied`} className="btn btn-ghost min-h-9 px-3" />
                <a href={`https://wa.me/?text=${encodeURIComponent(`${share.text}: ${share.url}`)}`} target="_blank" rel="noopener noreferrer" aria-label={`Share ${share.label} on WhatsApp`} title="WhatsApp" className="btn-icon"><MessageCircle className="w-5 h-5" /></a>
                <a href={share.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${share.label}`} title="Open" className="btn-icon"><ExternalLink className="w-5 h-5" /></a>
              </div>)}
            </div>
          </section>

          {/* Tools */}
          <section className="space-y-3" aria-labelledby="hub-tools">
            <h2 id="hub-tools" className="font-display text-2xl font-extrabold text-white">Tools</h2>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon={Tv} label="Big screen" onClick={() => onSelectViewMode('STAGE')} />
              <ToolButton icon={FileUp} label="Import Excel" onClick={() => onOpenBulkUploadModal?.()} />
              <ToolButton icon={Sparkles} label="Wheel" onClick={() => onOpenFortuneWheel?.()} />
              <ToolButton icon={ClipboardList} label="Edit form" onClick={() => onSelectViewMode('FORM_BUILDER')} />
              <ToolButton icon={Settings} label="Rules" onClick={() => onSelectViewMode('RULES')} />
              <ToolButton icon={Radio} label="OBS" onClick={() => onSelectViewMode('OBS')} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

function ToolButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="tile min-h-20 p-2 flex flex-col items-center justify-center gap-1.5 text-center text-xs font-bold text-slate-200 hover:border-white/25 hover:text-white transition-colors"><Icon className="w-5 h-5" />{label}</button>;
}
