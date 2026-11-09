import { csvCell } from '../utils/csvHelper';
import { PageHead } from '../ui/kit';
import { formatAuctionPrice } from '../utils/currency';
import React from 'react';
import { Player, Team, AuctionRules } from '../types';
import { Camera, Printer, Trophy, Users, Wallet, Zap, Shield, Sparkles, FileSpreadsheet, Download } from 'lucide-react';
import { TeamLogo } from './TeamLogo';

interface SquadSummaryViewProps {
  teams: Team[];
  players: Player[];
  rules: AuctionRules;
  onOpenPoster?: (player: Player, team: Team, price: number) => void;
}

export const SquadSummaryView: React.FC<SquadSummaryViewProps> = ({
  teams,
  players,
  rules,
  onOpenPoster,
}) => {
  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, rules.currency);
  };

  const soldPlayers = players.filter((p) => p.status === 'SOLD');
  const topBuys = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 4);

  const handleExportCSV = () => {
    const rows = [['Team', 'Owner', 'Player', 'Role', 'Category', 'Base price', 'Sold price', 'Status']];
    soldPlayers.forEach((p) => {
      const team = teams.find((t) => t.id === p.soldToTeamId);
      rows.push([team?.name || '', team?.ownerName || '', p.name, p.role, p.category || '', String(p.basePrice), String(p.soldPrice ?? p.basePrice), 'SOLD']);
    });
    players.filter((p) => p.status === 'UNSOLD').forEach((p) => rows.push(['Unsold', '', p.name, p.role, p.category || '', String(p.basePrice), '0', 'UNSOLD']));
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `squads_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-6">
      <PageHead title="Squads" count={soldPlayers.length} actions={<>
        <button onClick={handleExportCSV} className="btn btn-ghost"><FileSpreadsheet className="w-4 h-4" />Excel</button>
        <button onClick={() => window.print()} className="btn btn-ghost"><Printer className="w-4 h-4" />Print / PDF</button>
      </>} />

      {/* Top 4 Most Expensive Buys Ribbon */}
      {topBuys.length > 0 && (
        <div className="panel pitch-stripes p-5">
          <div className="flex items-center gap-2 text-xs font-black text-gold-400 mb-4">
            <Trophy className="w-4 h-4" />
            Top buys
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {topBuys.map((p, idx) => {
              const boughtTeam = teams.find((t) => t.id === p.soldToTeamId);
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 relative overflow-hidden"
                >
                  <span className="absolute top-1 right-2 text-3xl font-black text-white/5 font-display">
                    #{idx + 1}
                  </span>
                  <img decoding="async" loading="lazy" src={p.photoUrl || "/player-placeholder.svg"} alt={p.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                    <p className="caption text-[11px] text-slate-400">{boughtTeam?.name || 'Unknown'}</p>
                    <span className="text-xs font-black text-gold-400 font-mono">
                      {formatPrice(p.soldPrice || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams Squad Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const squad = players.filter((p) => p.soldToTeamId === team.id);
          const totalSpent = team.totalPurse - team.remainingPurse;

          return (
            <div
              key={team.id}
              className="rounded-3xl border border-white/10 glass-panel p-6 flex flex-col justify-between"
            >
              <div>
                {/* Team Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 p-1.5 rounded-xl bg-obsidian-950/80 border border-white/10 flex items-center justify-center shrink-0">
                      <TeamLogo logo={team.logo} name={team.name} className="w-full h-full text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white font-display">{team.name}</h3>
                      <p className="caption text-[11px] text-slate-400">{team.ownerName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white/5 text-slate-300">
                    {team.shortCode}
                  </span>
                </div>

                {/* Team Purse Stats */}
                <div className="grid grid-cols-2 gap-2 my-4 text-center">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="caption text-[11px] font-bold text-slate-400 block">Spent</span>
                    <span className="text-sm font-black text-gold-400 font-mono">{formatPrice(totalSpent)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="caption text-[11px] font-bold text-slate-400 block">Remaining</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      {formatPrice(team.remainingPurse)}
                    </span>
                  </div>
                </div>

                {/* Squad List */}
                <div className="space-y-2 mt-4">
                  <span className="text-xs font-bold text-slate-400 block">
                    Squad ({squad.length} / {rules.maxPlayersPerTeam})
                  </span>

                  {squad.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">No players yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {squad.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-obsidian-900 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <img decoding="async" loading="lazy" src={p.photoUrl || "/player-placeholder.svg"} alt={p.name} className="w-7 h-7 rounded-lg object-cover" />
                            <div>
                              <span className="font-bold text-white block truncate max-w-[130px]">{p.name}</span>
                              <span className="caption text-[11px] text-slate-400">{p.role}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-400 font-mono">
                              {formatPrice(p.soldPrice || 0)}
                            </span>
                            {onOpenPoster && (
                              <button
                                onClick={() => onOpenPoster(p, team, p.soldPrice || 0)}
                                className="p-1 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 transition-colors"
                                aria-label="Generate WhatsApp & Instagram Poster"
                                title="Generate WhatsApp & Instagram Poster"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Composition Pills Footer */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between caption text-[11px] text-slate-400 font-semibold">
                <span>BAT {squad.filter((p) => p.role === 'BATSMAN').length}</span>
                <span>BOWL {squad.filter((p) => p.role === 'BOWLER').length}</span>
                <span>AR {squad.filter((p) => p.role === 'ALL_ROUNDER').length}</span>
                <span>WK {squad.filter((p) => p.role === 'WICKET_KEEPER').length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
