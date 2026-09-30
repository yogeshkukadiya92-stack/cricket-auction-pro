/**
 * Resilient Sync Manager for Cricket Auction Pro
 * 
 * Specifically engineered for LOW INTERNET (2G, 3G, intermittent Wi-Fi, high latency):
 * 1. Offline-First & Local-First: Immediate UI response via local IndexedDB.
 * 2. Persistent Write-Ahead Log: All mutations saved in `sync_outbox` prior to network send.
 * 3. Network Quality Profiling: Continuously measures RTT, bandwidth, and connection type.
 * 4. Delta Synchronization: Sends micro-payloads instead of massive JSON trees.
 * 5. Adaptive Batching & Backoff: Batches changes on slow 2G to preserve bandwidth.
 * 6. Never Loses Data: Retries failed network requests indefinitely with exponential backoff.
 */

import { localDb, OutboxTask } from './localDb';
import { Tournament, Team, Player, AuctionRules, BidRecord } from '../types';

export type NetworkTier = 'FAST' | 'LOW_BANDWIDTH' | 'OFFLINE';

export interface NetworkHealth {
  tier: NetworkTier;
  isOnline: boolean;
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  rttMs: number;
  downlinkMb?: number;
  pendingSyncCount: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
}

class ResilientSyncManager {
  private networkHealth: NetworkHealth = {
    tier: 'FAST',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    rttMs: 50,
    pendingSyncCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  };

  private listeners: ((health: NetworkHealth) => void)[] = [];
  private syncTimer: any = null;
  private pingTimer: any = null;
  private isProcessingOutbox = false;
  private backoffDelayMs = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkEvent(true));
      window.addEventListener('offline', () => this.handleNetworkEvent(false));

      // Network Information API if supported
      const navConn = (navigator as any).connection;
      if (navConn) {
        navConn.addEventListener('change', () => this.checkNetworkQuality());
      }

      // Initial network ping check
      setTimeout(() => {
        this.checkNetworkQuality();
        this.refreshPendingCount();
        this.triggerOutboxDrain();
      }, 500);

      // Periodic gentle ping check every 25 seconds
      this.pingTimer = setInterval(() => {
        this.checkNetworkQuality();
      }, 25000);
    }
  }

  public subscribe(callback: (health: NetworkHealth) => void): () => void {
    this.listeners.push(callback);
    callback({ ...this.networkHealth });
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const snapshot = { ...this.networkHealth };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in network health listener:', err);
      }
    }
  }

  /**
   * Fast, low-overhead RTT measurement ping to /api/ping
   */
  public async checkNetworkQuality(): Promise<NetworkTier> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.networkHealth.isOnline = false;
      this.networkHealth.tier = 'OFFLINE';
      this.notify();
      return 'OFFLINE';
    }

    const navConn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
    let effectiveType = navConn?.effectiveType || '4g';
    let downlinkMb = navConn?.downlink || 10;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/ping', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const rtt = Math.round(performance.now() - start);
      this.networkHealth.rttMs = rtt;
      this.networkHealth.isOnline = true;
      this.networkHealth.effectiveType = effectiveType;
      this.networkHealth.downlinkMb = downlinkMb;

      // Classify network tier:
      // If RTT > 600ms or 2G / slow-2g or downlink < 0.5 Mbps -> Low Bandwidth
      if (rtt > 600 || effectiveType === '2g' || effectiveType === 'slow-2g' || downlinkMb < 0.5) {
        this.networkHealth.tier = 'LOW_BANDWIDTH';
      } else {
        this.networkHealth.tier = 'FAST';
      }
    } catch {
      // Ping failed or timed out
      if (!navigator.onLine) {
        this.networkHealth.isOnline = false;
        this.networkHealth.tier = 'OFFLINE';
      } else {
        // High packet loss / weak signal
        this.networkHealth.tier = 'LOW_BANDWIDTH';
        this.networkHealth.rttMs = 9999;
      }
    }

    this.notify();
    return this.networkHealth.tier;
  }

  private handleNetworkEvent(online: boolean) {
    this.networkHealth.isOnline = online;
    if (!online) {
      this.networkHealth.tier = 'OFFLINE';
      this.notify();
    } else {
      this.backoffDelayMs = 1000;
      this.checkNetworkQuality().then(() => {
        this.triggerOutboxDrain();
      });
    }
  }

  public async refreshPendingCount() {
    const count = await localDb.getPendingOutboxCount();
    this.networkHealth.pendingSyncCount = count;
    this.notify();
  }

  // --- Stale-While-Revalidate Initial Data Loading ---

  /**
   * Instantly loads local data from IndexedDB (0ms delay),
   * then reconciles with server in the background if connection allows.
   */
  public async loadInitialLocalData(): Promise<{
    tournaments: Tournament[];
    teams: Team[];
    players: Player[];
    rules: AuctionRules | null;
    liveState: any;
  }> {
    const [tournaments, teams, players, rulesList, liveStateList] = await Promise.all([
      localDb.getAll<Tournament>('tournaments'),
      localDb.getAll<Team>('teams'),
      localDb.getAll<Player>('players'),
      localDb.getAll<AuctionRules>('rules'),
      localDb.getAll<any>('live_state'),
    ]);

    return {
      tournaments,
      teams,
      players,
      rules: rulesList.length > 0 ? rulesList[0] : null,
      liveState: liveStateList.length > 0 ? liveStateList[0] : null,
    };
  }

  // --- Local-First Mutations with Outbox Queuing ---

  public async mutateTournament(tournament: Tournament) {
    await localDb.put('tournaments', tournament);
    await localDb.queueOutboxTask('UPSERT_TOURNAMENT', tournament);
    this.scheduleOutboxDrain();
  }

  public async removeTournament(id: string) {
    await localDb.deleteItem('tournaments', id);
    await localDb.queueOutboxTask('DELETE_TOURNAMENT', { id });
    this.scheduleOutboxDrain();
  }

  public async mutateTeam(team: Team) {
    await localDb.put('teams', team);
    await localDb.queueOutboxTask('UPSERT_TEAM', team);
    this.scheduleOutboxDrain();
  }

  public async removeTeam(id: string) {
    await localDb.deleteItem('teams', id);
    await localDb.queueOutboxTask('DELETE_TEAM', { id });
    this.scheduleOutboxDrain();
  }

  public async mutatePlayer(player: Player) {
    await localDb.put('players', player);
    await localDb.queueOutboxTask('UPSERT_PLAYER', player);
    this.scheduleOutboxDrain();
  }

  public async mutateBulkPlayers(players: Player[]) {
    await localDb.putMany('players', players);
    await localDb.queueOutboxTask('BULK_PLAYERS', players);
    this.scheduleOutboxDrain();
  }

  public async removePlayer(id: string) {
    await localDb.deleteItem('players', id);
    await localDb.queueOutboxTask('DELETE_PLAYER', { id });
    this.scheduleOutboxDrain();
  }

  public async mutateBid(record: BidRecord) {
    await localDb.put('bids', record);
    await localDb.queueOutboxTask('RECORD_BID', record);
    this.scheduleOutboxDrain();
  }

  public async mutateLiveState(state: any) {
    const item = { id: 'active', ...state };
    await localDb.put('live_state', item);
    await localDb.queueOutboxTask('UPDATE_LIVE_STATE', item);
    this.scheduleOutboxDrain();
  }

  public async mutateRules(rules: AuctionRules) {
    const item = { id: 'global', ...rules };
    await localDb.put('rules', item);
    await localDb.queueOutboxTask('UPDATE_RULES', rules);
    this.scheduleOutboxDrain();
  }

  // --- Outbox Draining Engine (Adaptive for Low Internet) ---

  private scheduleOutboxDrain() {
    this.refreshPendingCount();

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Adapt debounce delay according to network tier:
    // Fast 4G: 300ms
    // Low Bandwidth 2G/3G: 2000ms (to batch requests and save mobile radio battery/bandwidth)
    const delay = this.networkHealth.tier === 'LOW_BANDWIDTH' ? 2000 : 300;

    this.syncTimer = setTimeout(() => {
      this.triggerOutboxDrain();
    }, delay);
  }

  public async triggerOutboxDrain(): Promise<void> {
    if (this.isProcessingOutbox) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.networkHealth.tier = 'OFFLINE';
      this.notify();
      return;
    }

    this.isProcessingOutbox = true;
    this.networkHealth.isSyncing = true;
    this.notify();

    try {
      // Process pending tasks in batches
      // On slow network, send batches of max 15 items to avoid HTTP payload timeout
      const batchSize = this.networkHealth.tier === 'LOW_BANDWIDTH' ? 10 : 30;
      const tasks: OutboxTask[] = await localDb.getPendingOutboxTasks(batchSize);

      if (tasks.length === 0) {
        this.networkHealth.isSyncing = false;
        this.networkHealth.lastSyncedAt = new Date();
        this.backoffDelayMs = 1000;
        await this.refreshPendingCount();
        this.isProcessingOutbox = false;
        return;
      }

      // Mark tasks as syncing
      const taskIds = tasks.map((t) => t.id);

      // Low internet adaptive timeout (up to 15 seconds on 2G)
      const timeoutMs = this.networkHealth.tier === 'LOW_BANDWIDTH' ? 15000 : 6000;
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/db/delta-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.processedIds)) {
          // Successfully processed! Clean up from IndexedDB Outbox
          await localDb.removeOutboxTasks(result.processedIds);
          this.networkHealth.lastSyncedAt = new Date();
          this.backoffDelayMs = 1000; // Reset backoff
        }
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.warn('[SyncManager] Outbox batch sync failed or timed out:', err.message);
      // Exponential backoff
      this.backoffDelayMs = Math.min(this.backoffDelayMs * 2, 30000);
      if (this.networkHealth.tier === 'FAST') {
        this.networkHealth.tier = 'LOW_BANDWIDTH';
      }
    } finally {
      this.isProcessingOutbox = false;
      this.networkHealth.isSyncing = false;
      await this.refreshPendingCount();

      // Check if more items remain in outbox
      const remainingCount = await localDb.getPendingOutboxCount();
      if (remainingCount > 0 && navigator.onLine) {
        setTimeout(() => {
          this.triggerOutboxDrain();
        }, this.backoffDelayMs);
      }
    }
  }

  public async forceSyncNow(): Promise<boolean> {
    await this.checkNetworkQuality();
    if (!this.networkHealth.isOnline) return false;
    await this.triggerOutboxDrain();
    return true;
  }
}

export const syncManager = new ResilientSyncManager();
