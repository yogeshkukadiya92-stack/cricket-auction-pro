import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  getDb,
  getAllTournaments,
  saveTournament,
  deleteTournament,
  getAllTeams,
  saveTeam,
  deleteTeam,
  getAllPlayers,
  savePlayer,
  deletePlayer,
  getAuctionRules,
  saveAuctionRules,
  getLiveAuctionState,
  saveLiveAuctionState,
  recordBid,
  clearAllAuctionData,
  getFullDatabaseBackup,
  restoreDatabaseBackup,
  seedInitialDataIfEmpty,
  registerUser,
  loginUser,
  getAllUsers,
  toggleUserStatus,
  getAdminPlatformStats,
} from './server/db.js';

function liveAuctionDatabasePlugin(): Plugin {
  const sseClients = new Set<ServerResponse>();

  // Ensure DB is initialized
  try {
    getDb();
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
  }

  const broadcastSSE = (data: any) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const readBody = (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  };

  return {
    name: 'live-auction-database-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // CORS headers for local LAN, mobile devices, and OBS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // 1. Server-Sent Events (SSE) Stream
        if (url.startsWith('/api/live-stream')) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          const liveAuctionState = getLiveAuctionState();
          const players = getAllPlayers();

          res.write(
            `data: ${JSON.stringify({
              type: 'INIT',
              players,
              auctionState: liveAuctionState,
            })}\n\n`
          );
          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. Database Bootstrap: Load all records on app startup
        if (url === '/api/db/bootstrap' && req.method === 'GET') {
          try {
            const tournaments = getAllTournaments();
            const teams = getAllTeams();
            const players = getAllPlayers();
            const rules = getAuctionRules();
            const liveState = getLiveAuctionState();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                dbType: 'SQLite3 (Node.js Native ACID)',
                dbFile: 'database/cricket_auction.db',
                tournaments,
                teams,
                players,
                rules,
                liveState,
              })
            );
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 3. Database Sync / Upsert endpoint
        if (url === '/api/db/sync' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            if (body.tournament) {
              saveTournament(body.tournament);
            }
            if (body.tournaments && Array.isArray(body.tournaments)) {
              for (const t of body.tournaments) saveTournament(t);
            }
            if (body.team) {
              saveTeam(body.team);
            }
            if (body.teams && Array.isArray(body.teams)) {
              for (const tm of body.teams) saveTeam(tm);
            }
            if (body.player) {
              savePlayer(body.player);
            }
            if (body.players && Array.isArray(body.players)) {
              for (const p of body.players) savePlayer(p);
            }
            if (body.rules) {
              saveAuctionRules(body.rules);
            }
            if (body.liveState) {
              saveLiveAuctionState(body.liveState);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, syncedAt: new Date().toISOString() }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 4. Register Player (Public form submitted on phone / web)
        if (url === '/api/register-player' && req.method === 'POST') {
          const body = await readBody(req);
          if (body && body.player) {
            savePlayer(body.player);
            broadcastSSE({ type: 'PLAYER_REGISTERED', payload: { player: body.player } });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, player: body.player }));
            return;
          }
        }

        // 5. Place Bid (From Team Paddle or Console)
        if (url === '/api/place-bid' && req.method === 'POST') {
          const body = await readBody(req);
          if (body) {
            if (body.record) {
              recordBid(body.record);
            }
            const currentState = getLiveAuctionState();
            currentState.currentBid = body.amount;
            currentState.leadingTeam = body.team;
            if (body.record) {
              currentState.bidsHistory = [body.record, ...(currentState.bidsHistory || [])];
            }
            saveLiveAuctionState(currentState);

            broadcastSSE({ type: 'BID_PLACED', payload: body });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        // 6. General Auction Actions
        if (url === '/api/action' && req.method === 'POST') {
          const body = await readBody(req);
          if (body && body.type) {
            const currentState = getLiveAuctionState();

            if (body.type === 'SELECT_PLAYER') {
              currentState.currentPlayerId = body.payload?.player?.id || '';
              currentState.currentBid = 0;
              currentState.leadingTeam = null;
              currentState.bidsHistory = [];
              saveLiveAuctionState(currentState);
            } else if (body.type === 'HAMMER_SOLD') {
              const { player, team, price } = body.payload || {};
              if (player && team) {
                // Update player in SQLite
                player.status = 'SOLD';
                player.soldToTeamId = team.id;
                player.soldPrice = price;
                savePlayer(player);

                // Update team remaining purse in SQLite
                const allTeams = getAllTeams();
                const currentTeam = allTeams.find((t: any) => t.id === team.id);
                if (currentTeam) {
                  currentTeam.remainingPurse = Math.max(0, currentTeam.remainingPurse - price);
                  saveTeam(currentTeam);
                }
              }
              currentState.currentPlayerId = '';
              currentState.currentBid = 0;
              currentState.leadingTeam = null;
              currentState.bidsHistory = [];
              saveLiveAuctionState(currentState);
            } else if (body.type === 'MARK_UNSOLD') {
              const { player } = body.payload || {};
              if (player) {
                player.status = 'UNSOLD';
                savePlayer(player);
              }
              currentState.currentPlayerId = '';
              currentState.currentBid = 0;
              currentState.leadingTeam = null;
              currentState.bidsHistory = [];
              saveLiveAuctionState(currentState);
            } else if (body.type === 'PLAYER_APPROVED') {
              const players = getAllPlayers();
              const p = players.find((item: any) => item.id === body.payload?.playerId);
              if (p) {
                p.approvalStatus = 'APPROVED';
                p.status = 'AVAILABLE';
                savePlayer(p);
              }
            } else if (body.type === 'PLAYER_REJECTED') {
              const players = getAllPlayers();
              const p = players.find((item: any) => item.id === body.payload?.playerId);
              if (p) {
                p.approvalStatus = 'REJECTED';
                savePlayer(p);
              }
            } else if (body.type === 'TOURNAMENT_CREATED' || body.type === 'TOURNAMENT_UPDATED') {
              if (body.payload?.tournament) {
                saveTournament(body.payload.tournament);
              }
            } else if (body.type === 'CLEAR_ALL_DATA') {
              clearAllAuctionData();
            }

            broadcastSSE(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        // 7. Full Database Export / Backup Download
        if (url === '/api/db/export' && req.method === 'GET') {
          const backup = getFullDatabaseBackup();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="cricket_auction_backup_${Date.now()}.json"`,
          });
          res.end(JSON.stringify(backup, null, 2));
          return;
        }

        // 8. Database Restore / Import
        if (url === '/api/db/import' && req.method === 'POST') {
          const body = await readBody(req);
          const ok = restoreDatabaseBackup(body);
          if (ok) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Database restored successfully' }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Invalid backup format' }));
          }
          return;
        }

        // 9. Auth: User Registration
        if (url === '/api/auth/register' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            const user = registerUser(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, user }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 10. Auth: User Login
        if (url === '/api/auth/login' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            const user = loginUser(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, user }));
          } catch (err: any) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 11. Admin: Get all users & organizers
        if (url === '/api/admin/users' && req.method === 'GET') {
          try {
            const users = getAllUsers();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, users }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 12. Admin: Toggle user active / blocked status
        if (url === '/api/admin/toggle-user' && req.method === 'POST') {
          try {
            const body = await readBody(req);
            const status = toggleUserStatus(body.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, status }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 13. Admin: Platform Stats
        if (url === '/api/admin/stats' && req.method === 'GET') {
          try {
            const stats = getAdminPlatformStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, stats }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liveAuctionDatabasePlugin()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    cors: true,
    allowedHosts: true,
  },
});
