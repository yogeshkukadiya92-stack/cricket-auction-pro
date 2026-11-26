// Each unfilled squad slot keeps the reserve booked, or the current player's base price when no reserve is set.
export function withSlotReserve(rules, basePrice) {
  return { ...rules, minimumPlayerReserve: rules.minimumPlayerReserve || basePrice || 0 };
}

// Reserve the cost of filling the required squad after buying this player.
export function getBidBudget(team, players, rules) {
  const bought = players.filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id).length;
  const remainingSlots = Math.max(0, (rules.minPlayersPerTeam || 0) - bought - 1);
  const reserve = remainingSlots * (rules.minimumPlayerReserve || 0);
  const squadComplete = bought >= (rules.maxPlayersPerTeam || 15);
  const maxBid = squadComplete ? 0 : Math.max(0, team.remainingPurse - reserve);
  return { bought, remainingSlots, reserve, maxBid, squadComplete };
}
