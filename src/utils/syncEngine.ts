import { Player, Team, BidRecord, Tournament } from '../types';

export type SyncAction =
  | { type: 'BID_PLACED'; payload: { team: Team; amount: number; record: BidRecord } }
  | { type: 'HAMMER_SOLD'; payload: { player: Player; team: Team; price: number } }
  | { type: 'MARK_UNSOLD'; payload: { player: Player } }
  | { type: 'UNDO_BID'; payload: { prevBid: BidRecord | null } }
  | { type: 'SELECT_PLAYER'; payload: { player: Player } }
  | { type: 'PLAYER_REGISTERED'; payload: { player: Player } }
  | { type: 'PLAYER_APPROVED'; payload: { playerId: string } }
  | { type: 'PLAYER_REJECTED'; payload: { playerId: string } }
  | { type: 'TOURNAMENT_CREATED'; payload: { tournament: Tournament } }
  | { type: 'TOURNAMENT_UPDATED'; payload: { tournament: Tournament } }
  | { type: 'TOURNAMENT_SELECTED'; payload: { tournamentId: string } }
  | { type: 'PLAYERS_UPDATED'; payload: { players: Player[] } }
  | { type: 'CLEAR_ALL_DATA' }
  | { type: 'RESET_AUCTION' };

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private listeners: ((action: SyncAction) => void)[] = [];

  constructor() {
  }

  public setScope(tournamentId: string) {
    this.channel?.close();
    this.channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(`cricket_auction_${tournamentId}`);
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.notify(event.data as SyncAction);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization error', err);
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
    // Sync only tabs showing the same tournament.
    if (this.channel) {
      try {
        this.channel.postMessage(action);
      } catch (e) {
        console.warn('Channel post error', e);
      }
    }
    // The initiating component already updates its state; notify remote tabs only.

  }
}

export const syncEngine = new SyncEngine();
