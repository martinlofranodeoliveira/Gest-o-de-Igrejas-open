import { IAuthService, User } from '../types';

export class SqliteAuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  constructor() {
    this.checkCurrentUser();
  }

  private async checkCurrentUser() {
    // Basic check for session if persistence is needed
  }

  async hasUsers(): Promise<boolean> {
    return window.electronAPI.authHasUsers();
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithGoogle() {
    // Not implemented for SQLite (would be direct login)
    throw new Error('Not supported');
  }

  async login(email: string, password: string): Promise<User | null> {
    const user = await (window as any).electronAPI.authLogin(email, password);
    if (user) {
      this.currentUser = { uid: user.id, email: user.email, displayName: user.displayName };
      this.notify();
      return this.currentUser;
    }
    return null;
  }

  async register(email: string, password: string, displayName: string): Promise<User | null> {
    const user = await (window as any).electronAPI.authRegister(email, password, displayName);
    if (user) {
      this.currentUser = { uid: user.id, email: user.email, displayName: user.displayName };
      this.notify();
      return this.currentUser;
    }
    return null;
  }

  async signOut() {
    this.currentUser = null;
    this.notify();
  }

  private notify() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}
