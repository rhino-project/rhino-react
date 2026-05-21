export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createWebStorage(): StorageAdapter;
export function initStorage(): Promise<void>;
export declare const storage: StorageAdapter;
