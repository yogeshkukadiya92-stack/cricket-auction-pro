import { getBidBudget } from './auctionBudget.js';
export function correctPlayer(players, teams, playerId, action, teamId, amount, rules) {
  const player = players.find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');
  let nextTeams = teams.map(t => ({ ...t }));
  if (player.status === 'SOLD') {
    const previous = nextTeams.find(t => t.id === player.soldToTeamId);
    if (!previous) throw new Error('Previous team not found');
    previous.remainingPurse += player.soldPrice || 0;
  }
  const { soldPrice, soldToTeamId, ...clean } = player;
  let corrected = { ...clean, status: action === 'SOLD' ? 'SOLD' : action === 'UNSOLD' ? 'UNSOLD' : 'AVAILABLE' };
  if (action === 'SOLD') {
    const team = nextTeams.find(t => t.id === teamId);
    if (!team || !Number.isFinite(amount) || amount < player.basePrice || amount <= 0) throw new Error('Select a team and price at least the player base price');
    if (player.approvalStatus && player.approvalStatus !== 'APPROVED') throw new Error('Approve this player before marking sold');
    const budget = getBidBudget(team, players.filter(p => p.id !== playerId), rules);
    if (budget.squadComplete) throw new Error('Squad complete');
    if (amount > budget.maxBid) throw new Error('Price exceeds maximum bid after squad reserve');
    team.remainingPurse -= amount;
    corrected = { ...corrected, soldPrice: amount, soldToTeamId: teamId };
  }
  return { player: corrected, teams: nextTeams, players: action === 'DELETE' ? players.filter(p => p.id !== playerId) : players.map(p => p.id === playerId ? corrected : p) };
}
