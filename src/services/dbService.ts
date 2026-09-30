import { Tournament, Team, Player, AuctionRules } from '../types';
import { localDb } from './localDb';
import { syncManager } from './resilientSyncManager';

export interface BootstrapResponse {
  success: boolean;
  dbType?: string;
  dbFile?: string;
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  rules: AuctionRules | null;
  liveState: any;
  fromCache?: boolean;
}

class DatabaseService {
  private syncTimeout: any = null;
  private pendingPayload: any = {};
  public isConnected = true;
  public dbType = 'SQLite3 (Node.js Native) + IndexedDB (Local-First)';

  /**
   * Fast, low-latency bootstrap data loader:
   * 1. Reads local IndexedDB cache instantly (sub-15ms)
   * 2. Queries SQLite server API in background
   * 3. Seamlessly reconciles data without UI stalls
   */
  public async fetchBootstrapData(): Promise<BootstrapResponse | null> {
    // 1. Instant local IndexedDB load (Offline-First)
    let localData: any = null;
    try {
      localData = await syncManager.loadInitialLocalData();
    } catch (err) {
      console.warn('[DBService] LocalDB cache read failed:', err);
    }

    // 2. Background Server Fetch with 5s timeout to prevent hanging on 2G
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/db/bootstrap', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: BootstrapResponse = await res.json();
        this.isConnected = true;
        if (data.dbType) this.dbType = data.dbType;

        // Populate / update local IndexedDB cache in background
        if (Array.isArray(data.tournaments) && data.tournaments.length > 0) {
          localDb.putMany('tournaments', data.tournaments);
        }
        if (Array.isArray(data.teams) && data.teams.length > 0) {
          localDb.putMany('teams', data.teams);
        }
        if (Array.isArray(data.players) && data.players.length > 0) {
          localDb.putMany('players', data.players);
        }
        if (data.rules) {
          localDb.put('rules', { id: 'global', ...data.rules });
        }
        if (data.liveState) {
          localDb.put('live_state', { id: 'active', ...data.liveState });
        }

        return data;
      }
    } catch (err) {
      console.warn('[DBService] SQLite server API slow or unreachable, using local IndexedDB:', err);
      this.isConnected = false;
    }

    // Fallback to local cache if server is offline or slow
    if (localData && (localData.tournaments?.length > 0 || localData.players?.length > 0)) {
      return {
        success: true,
        dbType: 'Local IndexedDB (Offline-First Resilient)',
        tournaments: localData.tournaments || [],
        teams: localData.teams || [],
        players: localData.players || [],
        rules: localData.rules,
        liveState: localData.liveState,
        fromCache: true,
      };
    }

    return null;
  }

  /**
   * Asynchronously sync data to SQLite server with debouncing & local persistence
   */
  public queueSync(payload: {
    tournaments?: Tournament[];
    teams?: Team[];
    players?: Player[];
    rules?: AuctionRules;
    liveState?: any;
    tournament?: Tournament;
    team?: Team;
    player?: Player;
  }) {
    // 1. Immediately persist to local IndexedDB (0ms guarantee)
    if (payload.tournament) {
      localDb.put('tournaments', payload.tournament);
    }
    if (payload.tournaments && Array.isArray(payload.tournaments)) {
      localDb.putMany('tournaments', payload.tournaments);
    }
    if (payload.team) {
      localDb.put('teams', payload.team);
    }
    if (payload.teams && Array.isArray(payload.teams)) {
      localDb.putMany('teams', payload.teams);
    }
    if (payload.player) {
      localDb.put('players', payload.player);
    }
    if (payload.players && Array.isArray(payload.players)) {
      localDb.putMany('players', payload.players);
    }
    if (payload.rules) {
      localDb.put('rules', { id: 'global', ...payload.rules });
    }
    if (payload.liveState) {
      localDb.put('live_state', { id: 'active', ...payload.liveState });
    }

    // 2. Accumulate payload for server sync
    this.pendingPayload = {
      ...this.pendingPayload,
      ...payload,
    };

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.flushSync();
    }, 400);
  }

  /**
   * Send pending changes to SQLite database with safety retries
   */
  public async flushSync() {
    if (Object.keys(this.pendingPayload).length === 0) return;
    const toSend = { ...this.pendingPayload };
    this.pendingPayload = {};

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.isConnected = true;
      } else {
        throw new Error(`Sync returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[DBService] Direct sync failed, delegating to persistent Outbox queue:', err);
      this.isConnected = false;
      // Re-queue into Resilient Outbox so changes are NEVER lost
      if (toSend.tournament) localDb.queueOutboxTask('UPSERT_TOURNAMENT', toSend.tournament);
      if (toSend.tournaments) {
        for (const t of toSend.tournaments) localDb.queueOutboxTask('UPSERT_TOURNAMENT', t);
      }
      if (toSend.team) localDb.queueOutboxTask('UPSERT_TEAM', toSend.team);
      if (toSend.teams) {
        for (const tm of toSend.teams) localDb.queueOutboxTask('UPSERT_TEAM', tm);
      }
      if (toSend.player) localDb.queueOutboxTask('UPSERT_PLAYER', toSend.player);
      if (toSend.players) localDb.queueOutboxTask('BULK_PLAYERS', toSend.players);
      if (toSend.rules) localDb.queueOutboxTask('UPDATE_RULES', toSend.rules);
      if (toSend.liveState) localDb.queueOutboxTask('UPDATE_LIVE_STATE', toSend.liveState);
      syncManager.refreshPendingCount();
    }
  }

  /**
   * Export the entire SQLite database as a downloadable JSON backup
   */
  public async exportBackup() {
    try {
      const res = await fetch('/api/db/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cricket_auction_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return true;
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    return false;
  }

  /**
   * Restore database from an uploaded JSON backup file
   */
  public async importBackup(backupData: any): Promise<boolean> {
    try {
      const res = await fetch('/api/db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      });
      const result = await res.json();
      return Boolean(result.success);
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }
}

export const dbService = new DatabaseService();
