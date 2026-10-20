import { IDataRepository } from '../types';

export class LocalStorageRepository<T> implements IDataRepository<T> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  private getData(): T[] {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  private saveData(data: T[]): void {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  async getAll(): Promise<T[]> {
    return this.getData();
  }

  async add(item: Omit<T, 'id'>): Promise<string> {
    const data = this.getData();
    const id = Date.now().toString();
    const newItem = { ...item, id } as T;
    data.push(newItem);
    this.saveData(data);
    return id;
  }

  async update(id: string, item: Partial<T>): Promise<void> {
    const data = this.getData();
    const index = data.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...item };
      this.saveData(data);
    }
  }

  async delete(id: string): Promise<void> {
    const data = this.getData();
    const newData = data.filter((i: any) => i.id !== id);
    this.saveData(newData);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }

  onSnapshot(callback: (items: T[]) => void): () => void {
    // Basic implementation that triggers immediately
    this.getAll().then(callback);
    return () => {}; // No cleanup needed for simple implementation
  }
}
