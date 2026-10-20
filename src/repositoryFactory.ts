import { LocalStorageRepository } from './services/localStorageRepository';
import { SqliteRepository } from './services/sqliteRepository';
import { IDataRepository } from './types';

function isElectronRenderer() {
  return typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
}

export function createRepository<T>(collectionName: string): IDataRepository<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return new SqliteRepository<T>(collectionName);
  }

  if (isElectronRenderer()) {
    throw new Error('Desktop bridge indisponível');
  }

  return new LocalStorageRepository<T>(collectionName);
}
