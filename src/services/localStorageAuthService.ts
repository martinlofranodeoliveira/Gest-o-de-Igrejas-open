import { IAuthService, User } from '../types';
import { hashBrowserPassword, matchesBrowserPassword } from './browserPassword';

type StoredUser = { uid: string; email: string; passwordHash: string; displayName: string };
const STORAGE_KEY = 'gestao-igrejas-open.users.v1';

/** Browser demonstration only; browser-profile access is not a security boundary. */
export class LocalStorageAuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  private users(): StoredUser[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    const users: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(users) || users.some(user => !user ||
        ['uid', 'email', 'passwordHash', 'displayName'].some(key => typeof user[key] !== 'string'))) {
      throw new Error('Não foi possível ler a conta local. Restaure um backup válido.');
    }
    return users;
  }

  async hasUsers(): Promise<boolean> { return this.users().length > 0; }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => { this.listeners = this.listeners.filter(listener => listener !== callback); };
  }

  async signInWithGoogle() { throw new Error('Not supported'); }

  async login(email: string, password: string): Promise<User | null> {
    if (typeof email !== 'string') return null;
    const user = this.users().find(candidate => candidate.email === email.trim().toLowerCase());
    if (!user || !await matchesBrowserPassword(password, user.passwordHash)) return null;
    return this.select(user);
  }

  async register(email: string, password: string, displayName: string): Promise<User | null> {
    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') return null;
    const normalizedEmail = email.trim().toLowerCase();
    const name = displayName.trim();
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        !name || name.length > 80 || password.length < 12 || password.length > 128 || this.users().length) return null;
    const passwordHash = await hashBrowserPassword(password);
    const save = () => {
      if (this.users().length) return null;
      const user = { uid: crypto.randomUUID(), email: normalizedEmail, passwordHash, displayName: name };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([user]));
      return this.select(user);
    };
    if (typeof navigator === 'undefined' || !navigator.locks) {
      throw new Error('Use um navegador atualizado em localhost para criar a conta.');
    }
    return navigator.locks.request('gestao-igrejas-open-first-owner', save);
  }

  async signOut() { this.currentUser = null; this.notify(); }

  private select(user: StoredUser): User {
    this.currentUser = { uid: user.uid, email: user.email, displayName: user.displayName };
    this.notify();
    return this.currentUser;
  }

  private notify() { this.listeners.forEach(callback => callback(this.currentUser)); }
}
