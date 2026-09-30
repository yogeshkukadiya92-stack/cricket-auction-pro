import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

function liveAuctionServerPlugin(): Plugin {
  // In-memory real-time state for live cross-device auction
  const sseClients = new Set<ServerResponse>();
  let livePlayers: any[] = [];
  let liveAuctionState = {
    currentPlayerId: '',
    currentBid: 0,
    leadingTeam: null as any,
    bidsHistory: [] as any[],
  };

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
    name: 'live-auction-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // CORS headers for mobile and external devices
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
          res.write(
            `data: ${JSON.stringify({
              type: 'INIT',
              players: livePlayers,
              auctionState: liveAuctionState,
            })}\n\n`
          );
          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. Register Player (from Public Registration Form on phone or web)
        if (url === '/api/register-player' && req.method === 'POST') {
          const body = await readBody(req);
          if (body && body.player) {
            livePlayers = [body.player, ...livePlayers.filter((p) => p.id !== body.player.id)];
            broadcastSSE({ type: 'PLAYER_REGISTERED', payload: { player: body.player } });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: livePlayers.length }));
            return;
          }
        }

        // 3. Place Bid (from Team Paddle on mobile phone or auctioneer)
        if (url === '/api/place-bid' && req.method === 'POST') {
          const body = await readBody(req);
          if (body) {
            liveAuctionState.currentBid = body.amount;
            liveAuctionState.leadingTeam = body.team;
            if (body.record) {
              liveAuctionState.bidsHistory = [body.record, ...liveAuctionState.bidsHistory];
            }
            broadcastSSE({ type: 'BID_PLACED', payload: body });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        // 4. General Auction Action (SOLD, UNSOLD, SELECT_PLAYER, CLEAR_ALL_DATA)
        if (url === '/api/action' && req.method === 'POST') {
          const body = await readBody(req);
          if (body && body.type) {
            if (body.type === 'SELECT_PLAYER') {
              liveAuctionState.currentPlayerId = body.payload?.player?.id || '';
              liveAuctionState.currentBid = 0;
              liveAuctionState.leadingTeam = null;
              liveAuctionState.bidsHistory = [];
            } else if (body.type === 'CLEAR_ALL_DATA') {
              livePlayers = [];
              liveAuctionState = {
                currentPlayerId: '',
                currentBid: 0,
                leadingTeam: null,
                bidsHistory: [],
              };
            }
            broadcastSSE(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        // 5. Get current live state
        if (url === '/api/live-state' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ players: livePlayers, auctionState: liveAuctionState }));
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liveAuctionServerPlugin()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    cors: true,
    allowedHosts: true,
  },
})
