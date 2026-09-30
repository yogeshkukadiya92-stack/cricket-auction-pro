import { Tournament, Team, Player, AuctionRules } from '../types';

export interface BootstrapResponse {
  success: boolean;
  dbType?: string;
  dbFile?: string;
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  rules: AuctionRules | null;
  liveState: any;
}

class DatabaseService {
  private syncTimeout: any = null;
  private pendingPayload: any = {};
  public isConnected = false;
  public dbType = 'SQLite3';

  /**
   * Fetch initial data from SQLite server API on app launch
   */
  public async fetchBootstrapData(): Promise<BootstrapResponse | null> {
    try {
      const res = await fetch('/api/db/bootstrap');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: BootstrapResponse = await res.json();
      this.isConnected = true;
      if (data.dbType) this.dbType = data.dbType;
      return data;
    } catch (err) {
      console.warn('SQLite server API unavailable, using offline LocalStorage fallback:', err);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Asynchronously sync data to SQLite server with debouncing
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
   * Immediately send pending changes to SQLite database
   */
  public async flushSync() {
    if (Object.keys(this.pendingPayload).length === 0) return;
    const toSend = { ...this.pendingPayload };
    this.pendingPayload = {};

    try {
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      if (res.ok) {
        this.isConnected = true;
      }
    } catch (err) {
      console.warn('Failed to sync to SQLite server:', err);
      this.isConnected = false;
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
