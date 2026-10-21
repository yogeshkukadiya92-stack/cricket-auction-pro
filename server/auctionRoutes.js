import { randomUUID } from 'node:crypto';
import { getBidBudget } from '../shared/auctionBudget.js';

export function registerAuctionRoutes(app, { pool, requireUser, owns }) {
// Auction commands serialize on the tournament row, so two devices cannot
// accept stale bids or deduct a winning team's purse more than once.
app.post('/api/tournaments/:id/auction', requireUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await owns(req.params.id, req.user.id, client)) throw Object.assign(new Error('Tournament not found'), { status: 404 });
    await client.query('SELECT id FROM tournaments WHERE id=$1 FOR UPDATE', [req.params.id]);
    const live = await client.query('SELECT data FROM tournament_live_state WHERE tournament_id=$1', [req.params.id]);
    let state = live.rows[0]?.data || { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] };
    const playerRows = await client.query('SELECT data FROM players WHERE tournament_id=$1', [req.params.id]);
    const teamRows = await client.query('SELECT data FROM teams WHERE tournament_id=$1', [req.params.id]);
    let players = playerRows.rows.map(x => x.data), teams = teamRows.rows.map(x => x.data);
    const body = req.body || {};
    const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
    const eligible = p => p && (!p.approvalStatus || p.approvalStatus === 'APPROVED') && ['AVAILABLE','IN_AUCTION'].includes(p.status);
    if (['SELECT', 'ACCELERATE'].includes(body.action) && state.currentBid > 0 && (body.action !== 'SELECT' || body.playerId !== state.currentPlayerId)) fail('Finish or undo the current bidding before switching players or starting another round');
    if (body.action === 'SELECT' && body.playerId === state.currentPlayerId) {
      // Re-selecting the current lot must never clear accepted bids.
    } else if (body.action === 'ACCELERATE') {
      const discount = body.discountPercent;
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw Object.assign(new Error('Invalid discount'), { status: 400 });
      const recalled = players.filter(p => p.status === 'UNSOLD' && (!p.approvalStatus || p.approvalStatus === 'APPROVED'));
      if (!recalled.length) fail('No unsold players available');
      players = players.map(p => recalled.some(x => x.id === p.id) ? { ...p, status: 'AVAILABLE', category: 'ACCELERATED', basePrice: Math.max(0, Math.round(p.basePrice * (1 - discount / 100))) } : p);
      for (const player of players.filter(p => recalled.some(x => x.id === p.id))) await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, player]);
      state = { currentPlayerId: recalled[0].id, currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else if (body.action === 'RESET') {
      players = players.map(p => { const { soldPrice, soldToTeamId, ...rest } = p; return { ...rest, status: 'AVAILABLE' }; });
      teams = teams.map(t => ({ ...t, remainingPurse: t.totalPurse }));
      for (const player of players) await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, player]);
      for (const team of teams) await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, team.id, team]);
      state = { currentPlayerId: '', currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else if (body.action === 'SELECT') {
      const player = players.find(p => p.id === body.playerId);
      if (!eligible(player)) fail('Player is not available for auction');
      state = { currentPlayerId: player.id, currentBid: 0, leadingTeam: null, bidsHistory: [] };
    } else {
      const player = players.find(p => p.id === state.currentPlayerId);
      if (!eligible(player) || body.playerId !== player.id) fail('Auction lot changed; refresh and try again');
      const settings = await client.query("SELECT data->'rules' AS rules FROM tournaments WHERE id=$1", [req.params.id]);
      const rules = settings.rows[0]?.rules || {};
      if (body.action === 'BID') {
        const team = teams.find(t => t.id === body.teamId);
        const amount = body.amount;
        if (!team || !Number.isFinite(amount) || amount < player.basePrice || amount <= state.currentBid) fail('Bid must exceed the current bid and meet the base price');
        const budget = getBidBudget(team, players, rules);
        if (budget.squadComplete) fail(`Squad complete — ${team.name} has reached the maximum of ${rules.maxPlayersPerTeam || 15} players`);
        if ((rules.minimumPlayerReserve || !rules.allowNegativePurse) && amount > budget.maxBid) fail(`Maximum bid is ${budget.maxBid}; ${budget.reserve} must remain reserved for the squad`);
        if (players.filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id).length >= (rules.maxPlayersPerTeam || 15)) fail('Squad complete — no further players or bids allowed');
        const record = { id: randomUUID(), playerId: player.id, teamId: team.id, teamName: team.name, amount, timestamp: Date.now() };
        state = { ...state, currentBid: amount, leadingTeam: team, bidsHistory: [record, ...(state.bidsHistory || [])] };
      } else if (body.action === 'UNDO') {
        const history = (state.bidsHistory || []).slice(1), previous = history[0];
        state = { ...state, bidsHistory: history, currentBid: previous?.amount || 0, leadingTeam: teams.find(t => t.id === previous?.teamId) || null };
      } else if (body.action === 'SOLD' || body.action === 'UNSOLD') {
        if (body.action === 'SOLD') {
          const winner = teams.find(t => t.id === state.leadingTeam?.id);
          if (!winner || !state.currentBid || body.amount !== state.currentBid || body.teamId !== winner.id) fail('Winning bid changed; review it before marking sold');
          const budget = getBidBudget(winner, players, rules);
          if (budget.squadComplete) fail("Squad complete — no further players or bids allowed");
          if ((rules.minimumPlayerReserve || !rules.allowNegativePurse) && state.currentBid > budget.maxBid) fail(`Winning bid exceeds the current maximum of ${budget.maxBid}; undo the bid or update squad rules`);
          if (budget.bought >= (rules.maxPlayersPerTeam || 15)) fail('Squad complete — no further players or bids allowed');
          const sold = { ...player, status: 'SOLD', soldToTeamId: winner.id, soldPrice: state.currentBid };
          const updatedTeam = { ...winner, remainingPurse: winner.remainingPurse - state.currentBid };
          await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, sold]);
          await client.query('UPDATE teams SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, winner.id, updatedTeam]);
          players = players.map(p => p.id === sold.id ? sold : p);
          teams = teams.map(t => t.id === winner.id ? updatedTeam : t);
        } else {
          const unsold = { ...player, status: 'UNSOLD' };
          await client.query('UPDATE players SET data=$3 WHERE tournament_id=$1 AND id=$2', [req.params.id, player.id, unsold]);
          players = players.map(p => p.id === player.id ? unsold : p);
        }
        const lastEvent = { id: randomUUID(), type: body.action, player, team: state.leadingTeam, price: state.currentBid, timestamp: Date.now() };
        const next = players.find(eligible);
        state = { currentPlayerId: next?.id || '', currentBid: 0, leadingTeam: null, bidsHistory: [], lastEvent };
      } else throw Object.assign(new Error('Unknown auction command'), { status: 400 });
    }
    state.tournamentId = req.params.id;
    await client.query('INSERT INTO tournament_live_state(tournament_id,data) VALUES($1,$2) ON CONFLICT(tournament_id) DO UPDATE SET data=excluded.data', [req.params.id, state]);
    await client.query('COMMIT');
    const changesPlayers = ['SOLD', 'UNSOLD', 'RESET', 'ACCELERATE'].includes(body.action);
    res.json({ success: true, liveState: state, ...(changesPlayers ? { players, teams } : {}) });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

}
