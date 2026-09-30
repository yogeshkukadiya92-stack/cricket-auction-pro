/**
 * Local-First IndexedDB Database Engine for Cricket Auction Pro
 * 
 * Features:
 * - 100% offline-first persistent storage using browser native IndexedDB
 * - Zero-latency reads and writes (immediate optimistic UI updates)
 * - Persistent Write-Ahead Log (WAL) Outbox queue for synchronization
 * - Graceful fallback to localStorage if IndexedDB is blocked
 * - Handles massive storage (hundreds of tournaments & players with photos)
 */

import { Tournament, Team, Player, AuctionRules, BidRecord } from '../types';

export interface OutboxTask {
  id: string;
  action:
    | 'UPSERT_TOURNAMENT'
    | 'DELETE_TOURNAMENT'
    | 'UPSERT_TEAM'
    | 'DELETE_TEAM'
    | 'UPSERT_PLAYER'
    | 'DELETE_PLAYER'
    | 'BULK_PLAYERS'
    | 'RECORD_BID'
    | 'UPDATE_LIVE_STATE'
    | 'UPDATE_RULES';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'PENDING' | 'SYNCING';
  lastError?: string;
}

const DB_NAME = 'CricketAuctionLocalDB_v2';
const DB_VERSION = 1;

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  public async getDb(): Promise<IDBDatabase | null> {
    if (!this.isSupported) return null;
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;

          // 1. Tournaments Store
          if (!db.objectStoreNames.contains('tournaments')) {
            db.createObjectStore('tournaments', { keyPath: 'id' });
          }

          // 2. Teams Store
          if (!db.objectStoreNames.contains('teams')) {
            const teamStore = db.createObjectStore('teams', { keyPath: 'id' });
            teamStore.createIndex('tournamentId', 'tournamentId', { unique: false });
          }

          // 3. Players Store
          if (!db.objectStoreNames.contains('players')) {
            const playerStore = db.createObjectStore('players', { keyPath: 'id' });
            playerStore.createIndex('tournamentId', 'tournamentId', { unique: false });
            playerStore.createIndex('status', 'status', { unique: false });
          }

          // 4. Bids Store
          if (!db.objectStoreNames.contains('bids')) {
            const bidStore = db.createObjectStore('bids', { keyPath: 'id' });
            bidStore.createIndex('playerId', 'playerId', { unique: false });
          }

          // 5. Rules Store
          if (!db.objectStoreNames.contains('rules')) {
            db.createObjectStore('rules', { keyPath: 'id' });
          }

          // 6. Live Auction State Store
          if (!db.objectStoreNames.contains('live_state')) {
            db.createObjectStore('live_state', { keyPath: 'id' });
          }

          // 7. Sync Outbox Store (Write-Ahead Log)
          if (!db.objectStoreNames.contains('sync_outbox')) {
            const outboxStore = db.createObjectStore('sync_outbox', { keyPath: 'id' });
            outboxStore.createIndex('status', 'status', { unique: false });
            outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // 8. Key-Value Settings & Metadata Store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        };

        request.onsuccess = (event: any) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (err) => {
          console.warn('[LocalDB] IndexedDB open error, falling back to localStorage:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[LocalDB] IndexedDB initialization failed:', err);
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // --- Generic Store Operations ---

  public async put<T extends { id: string }>(storeName: string, item: T): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.putLocalStorageFallback(storeName, item);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        this.putLocalStorageFallback(storeName, item);
        resolve();
      }
    });
  }

  public async putMany<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    const db = await this.getDb();
    if (!db) {
      items.forEach((item) => this.putLocalStorageFallback(storeName, item));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        items.forEach((item) => this.putLocalStorageFallback(storeName, item));
        resolve();
      }
    });
  }

  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDb();
    if (!db) {
      return this.getLocalStorageFallback<T>(storeName, key);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(this.getLocalStorageFallback<T>(storeName, key));
      } catch {
        resolve(this.getLocalStorageFallback<T>(storeName, key));
      }
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    if (!db) {
      return this.getAllLocalStorageFallback<T>(storeName);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(this.getAllLocalStorageFallback<T>(storeName));
      } catch {
        resolve(this.getAllLocalStorageFallback<T>(storeName));
      }
    });
  }

  public async deleteItem(storeName: string, key: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.deleteLocalStorageFallback(storeName, key);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        this.deleteLocalStorageFallback(storeName, key);
        resolve();
      }
    });
  }

  public async clearStore(storeName: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      localStorage.removeItem(`cap_idb_${storeName}`);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- Outbox Queue Operations (Write-Ahead Log) ---

  public async queueOutboxTask(
    action: OutboxTask['action'],
    payload: any
  ): Promise<OutboxTask> {
    const task: OutboxTask = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      action,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };

    const db = await this.getDb();
    if (!db) {
      this.putLocalStorageFallback('sync_outbox', task);
      return task;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sync_outbox', 'readwrite');
        const store = tx.objectStore('sync_outbox');
        store.put(task);
        tx.oncomplete = () => resolve(task);
        tx.onerror = () => {
          this.putLocalStorageFallback('sync_outbox', task);
          resolve(task);
        };
      } catch {
        this.putLocalStorageFallback('sync_outbox', task);
        resolve(task);
      }
    });
  }

  public async getPendingOutboxTasks(limit = 25): Promise<OutboxTask[]> {
    const all = await this.getAll<OutboxTask>('sync_outbox');
    return all
      .filter((t) => t.status === 'PENDING' || t.status === 'SYNCING')
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, limit);
  }

  public async getPendingOutboxCount(): Promise<number> {
    const all = await this.getAll<OutboxTask>('sync_outbox');
    return all.filter((t) => t.status === 'PENDING' || t.status === 'SYNCING').length;
  }

  public async updateOutboxTask(
    id: string,
    updates: Partial<OutboxTask>
  ): Promise<void> {
    const task = await this.get<OutboxTask>('sync_outbox', id);
    if (!task) return;
    const updated = { ...task, ...updates };
    await this.put('sync_outbox', updated);
  }

  public async removeOutboxTask(id: string): Promise<void> {
    await this.deleteItem('sync_outbox', id);
  }

  public async removeOutboxTasks(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const db = await this.getDb();
    if (!db) {
      ids.forEach((id) => this.deleteLocalStorageFallback('sync_outbox', id));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('sync_outbox', 'readwrite');
        const store = tx.objectStore('sync_outbox');
        for (const id of ids) {
          store.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- Fallback LocalStorage Handlers ---

  private putLocalStorageFallback<T extends { id: string }>(storeName: string, item: T) {
    try {
      const key = `cap_idb_${storeName}`;
      const raw = localStorage.getItem(key);
      const list: T[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn(`[LocalDB Fallback] Failed writing ${storeName} to localStorage`, e);
    }
  }

  private getLocalStorageFallback<T>(storeName: string, id: string): T | null {
    try {
      const raw = localStorage.getItem(`cap_idb_${storeName}`);
      if (!raw) return null;
      const list: (T & { id: string })[] = JSON.parse(raw);
      const found = list.find((x) => x.id === id);
      return found || null;
    } catch {
      return null;
    }
  }

  private getAllLocalStorageFallback<T>(storeName: string): T[] {
    try {
      const raw = localStorage.getItem(`cap_idb_${storeName}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private deleteLocalStorageFallback(storeName: string, id: string) {
    try {
      const key = `cap_idb_${storeName}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list: { id: string }[] = JSON.parse(raw);
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  }
}

export const localDb = new LocalDatabase();
