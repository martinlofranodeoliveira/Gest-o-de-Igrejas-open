import { IAuthService } from './types';
import { SqliteAuthService } from './services/sqliteAuthService';
import { LocalStorageAuthService } from './services/localStorageAuthService';

function isElectronRenderer() {
  return typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
}

export function createAuthService(): IAuthService {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return new SqliteAuthService();
  }

  if (isElectronRenderer()) {
    throw new Error('Desktop bridge indisponível');
  }

  return new LocalStorageAuthService();
}
