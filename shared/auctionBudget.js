// Reserve the cost of filling the required squad after buying this player.
export function getBidBudget(team, players, rules) {
  const bought = players.filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id).length;
  const remainingSlots = Math.max(0, (rules.minPlayersPerTeam || 0) - bought - 1);
  const reserve = remainingSlots * (rules.minimumPlayerReserve || 0);
  const maxBid = Math.max(0, team.remainingPurse - reserve);
  return { bought, remainingSlots, reserve, maxBid };
}
