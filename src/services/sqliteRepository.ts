import { IDataRepository } from '../types';

export class SqliteRepository<T> implements IDataRepository<T> {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getAll(): Promise<T[]> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.sqliteGetAll<T>(this.tableName);
    }
    return [];
  }

  async add(item: Omit<T, 'id'>): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Gera ID no renderer usando Web Crypto, compatível com o bundle web.
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await window.electronAPI.sqliteAdd<T>(this.tableName, { ...item, id } as T);
      return id;
    }
    return '';
  }

  async update(id: string, item: Partial<T>): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.sqliteUpdate<T>(this.tableName, id, item);
    }
  }

  async delete(id: string): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.sqliteDelete(this.tableName, id);
    }
  }

  async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.sqliteClear(this.tableName);
    }
  }

  onSnapshot(callback: (items: T[]) => void): () => void {
    // Polling is kept for now but could be optimized with a custom IPC event emitter if performance demands
    this.getAll().then(callback);
    const interval = setInterval(() => {
      this.getAll().then(callback);
    }, 2000); // Reduced polling frequency for better responsiveness/performance
    return () => clearInterval(interval);
  }
}
