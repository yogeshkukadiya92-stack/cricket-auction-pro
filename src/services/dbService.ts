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
  private inFlight: Promise<void> = Promise.resolve();
  private generation = 0;
  private scope = '';
  private activePayload: any = {};
  public setScope(userId: string) {
    if (this.scope === userId) return;
    this.clearPending(); this.scope = userId;
    try { this.pendingPayload = JSON.parse(localStorage.getItem(`cap_pending_${userId}`) || '{}'); } catch { this.pendingPayload = {}; }
  }
  private persistPending() {
    if (!this.scope) return;
    try { localStorage.setItem(`cap_pending_${this.scope}`, JSON.stringify({ ...this.activePayload, ...this.pendingPayload })); } catch { this.notify('Changes could not be stored locally. Keep this tab open and retry saving.'); }
  }
  private listeners = new Set<(message: string) => void>();
  public subscribe(listener: (message: string) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify(message: string) { this.listeners.forEach(listener => listener(message)); }
  public isConnected = false;
  public dbType = 'PostgreSQL';

  /**
   * Fetch only the authenticated organizer's data.
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
      console.error('Database API unavailable:', err);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Asynchronously sync data to PostgreSQL with debouncing
   */
  public queueSync(payload: {
    tournaments?: Tournament[];
    teams?: Team[];
    players?: Player[];
    rules?: AuctionRules;
    tournamentId?: string;
    liveState?: any;
    tournament?: Tournament;
    team?: Team;
    player?: Player;
  }) {
    this.pendingPayload = { ...this.pendingPayload, ...payload };
    this.persistPending();
    this.notify('Saving changes…');

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.flushSync().catch(() => {});
    }, 400);
  }

  /**
   * Immediately send pending changes to PostgreSQL
   */
  public flushSync(): Promise<void> {
    this.inFlight = this.inFlight.catch(() => {}).then(() => this.sendPending());
    return this.inFlight;
  }

  public hasPending() { return Object.keys(this.pendingPayload).length > 0 || Object.keys(this.activePayload).length > 0; }

  public clearPending() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.pendingPayload = {};
    this.scope = '';
    this.activePayload = {};
    this.generation++;
    this.notify('');
  }

  private async sendPending() {
    if (Object.keys(this.pendingPayload).length === 0) return;
    const generation = this.generation;
    const toSend = { ...this.pendingPayload };
    this.pendingPayload = {};
    this.activePayload = toSend;

    try {
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      if (!res.ok) { const result = await res.json().catch(() => ({})); throw new Error(result.error || `Save failed: ${res.status}`); }
      this.isConnected = true;
      if (generation === this.generation) { this.activePayload = {}; this.persistPending(); this.notify(Object.keys(this.pendingPayload).length ? 'Saving changes…' : ''); }
    } catch (err) {
      console.error('Failed to sync to PostgreSQL:', err);
      this.isConnected = false;
      if (generation === this.generation) {
        this.activePayload = {};
        this.pendingPayload = { ...toSend, ...this.pendingPayload };
        this.persistPending();
        this.notify(`Changes are not saved: ${(err as Error).message}`);
        this.syncTimeout = setTimeout(() => this.flushSync().catch(() => {}), 5000);
      }
      throw err;
    }
  }

  /**
   * Export the organizer's data as a JSON backup
   */
  public async exportBackup() {
    try {
      await this.flushSync();
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
      await this.flushSync();
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
