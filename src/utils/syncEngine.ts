// Multi-Device & Cross-Network Real-Time Broadcast Bus for Cricket Auction Pro
import { Player, Team, BidRecord } from '../types';

export type SyncAction =
  | { type: 'BID_PLACED'; payload: { team: Team; amount: number; record: BidRecord } }
  | { type: 'HAMMER_SOLD'; payload: { player: Player; team: Team; price: number } }
  | { type: 'MARK_UNSOLD'; payload: { player: Player } }
  | { type: 'UNDO_BID'; payload: { prevBid: BidRecord | null } }
  | { type: 'SELECT_PLAYER'; payload: { player: Player } }
  | { type: 'PLAYER_REGISTERED'; payload: { player: Player } }
  | { type: 'PLAYER_APPROVED'; payload: { playerId: string } }
  | { type: 'PLAYER_REJECTED'; payload: { playerId: string } }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'RESET_AUCTION' };

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private sse: EventSource | null = null;
  private listeners: ((action: SyncAction) => void)[] = [];

  constructor() {
    // 1. Local Browser Tab Sync via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('cricket_auction_sync_bus');
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.notify(event.data as SyncAction);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization error', err);
      }
    }

    // 2. Cross-Device Network SSE Sync via /api/live-stream
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        this.sse = new EventSource('/api/live-stream');
        this.sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type && data.type !== 'INIT') {
              this.notify(data as SyncAction);
            }
          } catch {
            // Ignore malformed heartbeats
          }
        };
        this.sse.onerror = () => {
          // Graceful fallback to local BroadcastChannel if offline / static mode
        };
      } catch {
        // SSE unsupported or offline
      }
    }
  }

  public subscribe(cb: (action: SyncAction) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(action: SyncAction) {
    this.listeners.forEach((listener) => {
      try {
        listener(action);
      } catch (err) {
        console.error('Error in sync listener', err);
      }
    });
  }

  public async broadcast(action: SyncAction) {
    // 1. Broadcast to local tabs on this device
    if (this.channel) {
      try {
        this.channel.postMessage(action);
      } catch (e) {
        console.warn('Channel post error', e);
      }
    }
    // Also dispatch to local component listeners
    this.notify(action);

    // 2. Broadcast across all network devices via server API
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      try {
        if (action.type === 'BID_PLACED') {
          fetch('/api/place-bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          }).catch(() => {});
        } else if (action.type === 'PLAYER_REGISTERED') {
          fetch('/api/register-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          }).catch(() => {});
        } else {
          fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action),
          }).catch(() => {});
        }
      } catch {
        // Offline or static server
      }
    }
  }
}

export const syncEngine = new SyncEngine();
