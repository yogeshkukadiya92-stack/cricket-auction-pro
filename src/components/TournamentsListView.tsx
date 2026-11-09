import React from 'react';
import { ArrowRight, Calendar, Edit3, MapPin, Plus, Trash2, Trophy } from 'lucide-react';
import { Player, Team, Tournament } from '../types';
import { ask, Empty, PageHead } from '../ui/kit';
import { TeamLogo } from './TeamLogo';

interface TournamentsListViewProps {
  tournaments: Tournament[];
  activeTournamentId: string;
  teams: Team[];
  players: Player[];
  onSelectTournament: (tournamentId: string) => void;
  onEditTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournamentId: string) => void;
  onCreateNewTournament: () => void;
}

export const TournamentsListView: React.FC<TournamentsListViewProps> = ({
  tournaments, activeTournamentId, teams, players, onSelectTournament, onEditTournament, onDeleteTournament, onCreateNewTournament,
}) => {
  const create = <button onClick={onCreateNewTournament} className="btn btn-primary"><Plus className="w-4 h-4" />New tournament</button>;
  return (
    <div className="space-y-6">
      <PageHead title="Tournaments" count={tournaments.length || undefined} actions={tournaments.length ? create : undefined} />

      {tournaments.length === 0
        ? <Empty icon={Trophy} title="Create your first tournament" actions={create} />
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((item) => {
            const teamCount = teams.filter((t) => t.tournamentId === item.id).length;
            const list = players.filter((p) => p.tournamentId === item.id);
            const soldCount = list.filter((p) => p.status === 'SOLD').length;
            const active = item.id === activeTournamentId;
            return <article key={item.id} className={`panel p-5 flex flex-col gap-4 ${active ? 'border-gold-400/60' : ''}`}>
              <div className="flex items-start gap-3.5">
                <span className="w-14 h-14 shrink-0 rounded-xl border border-white/10 bg-obsidian-950 p-1.5 grid place-items-center overflow-hidden"><TeamLogo logo={item.logoUrl || '🏆'} name={item.name} className="w-full h-full text-3xl" /></span>
                <div className="min-w-0 flex-1">
                  <span className={`caption text-[11px] font-extrabold ${item.status === 'LIVE' ? 'text-red-400' : 'text-slate-400'}`}>{item.status === 'LIVE' ? '● Live' : item.status === 'UPCOMING' ? 'Upcoming' : 'Finished'}</span>
                  <h2 className="font-display text-3xl font-extrabold leading-tight text-white break-words">{item.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{item.season} · {item.year}</p>
                </div>
              </div>

              {(item.ground || item.startDate) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {item.ground && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{item.ground}</span>}
                {item.startDate && <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{item.startDate}</span>}
              </div>}

              <dl className="grid grid-cols-3 gap-2 text-center">
                <Count label="Teams" value={teamCount} />
                <Count label="Players" value={list.length} />
                <Count label="Sold" value={soldCount} />
              </dl>

              <div className="mt-auto flex items-center gap-1">
                <button onClick={() => onSelectTournament(item.id)} className="btn btn-primary flex-1">Open<ArrowRight className="w-4 h-4" /></button>
                <button onClick={() => onEditTournament(item)} aria-label={`Edit ${item.name}`} title="Edit" className="btn-icon"><Edit3 className="w-5 h-5" /></button>
                <button
                  onClick={async () => { if (await ask({ title: `Delete ${item.name}?`, body: 'Its teams, players and auction results are removed permanently.', confirmLabel: 'Delete', danger: true })) onDeleteTournament(item.id); }}
                  aria-label={`Delete ${item.name}`} title="Delete" className="btn-icon hover:text-red-300"
                ><Trash2 className="w-5 h-5" /></button>
              </div>
            </article>;
          })}
        </div>}
    </div>
  );
};

function Count({ label, value }: { label: string; value: number }) {
  return <div className="tile py-2"><dd className="score text-3xl leading-tight text-white">{value}</dd><dt className="mt-0.5 caption text-[11px] font-bold text-slate-400">{label}</dt></div>;
}
