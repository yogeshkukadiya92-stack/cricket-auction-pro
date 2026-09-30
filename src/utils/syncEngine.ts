// Multi-Device & Multi-Window Real-Time Broadcast Bus for Cricket Auction Pro
import { Player, Team, BidRecord } from '../types';

export type SyncAction =
  | { type: 'BID_PLACED'; payload: { team: Team; amount: number; record: BidRecord } }
  | { type: 'HAMMER_SOLD'; payload: { player: Player; team: Team; price: number } }
  | { type: 'MARK_UNSOLD'; payload: { player: Player } }
  | { type: 'UNDO_BID'; payload: { prevBid: BidRecord | null } }
  | { type: 'SELECT_PLAYER'; payload: { player: Player } }
  | { type: 'RESET_AUCTION' };

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private listeners: ((action: SyncAction) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('cricket_auction_sync_bus');
      this.channel.onmessage = (event) => {
        if (event.data) {
          this.notify(event.data as SyncAction);
        }
      };
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

  public broadcast(action: SyncAction) {
    if (this.channel) {
      this.channel.postMessage(action);
    }
    // Also dispatch to local listeners
    this.notify(action);
  }
}

export const syncEngine = new SyncEngine();
