// Bulk updates keep binary media in place and avoid one database round trip per player.
export async function patchAuctionPlayers(client, tournamentId, players) {
  if (!players.length) return;
  const patches = players.map(({ photoUrl, paymentScreenshotUrl, customData, ...data }) => data);
  await client.query(`UPDATE players p SET data=(p.data - 'soldPrice' - 'soldToTeamId') || incoming.data
    FROM jsonb_array_elements($2::jsonb) AS incoming(data)
    WHERE p.tournament_id=$1 AND p.id=incoming.data->>'id'`, [tournamentId, JSON.stringify(patches)]);
}
export async function patchAuctionTeams(client, tournamentId, teams) {
  if (!teams.length) return;
  const patches = teams.map(({ logo, ...data }) => data);
  await client.query(`UPDATE teams t SET data=t.data || incoming.data
    FROM jsonb_array_elements($2::jsonb) AS incoming(data)
    WHERE t.tournament_id=$1 AND t.id=incoming.data->>'id'`, [tournamentId, JSON.stringify(patches)]);
}
