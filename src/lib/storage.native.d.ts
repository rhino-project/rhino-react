export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function initStorage(): Promise<void>;
export function createNativeStorage(): StorageAdapter;
export declare const storage: StorageAdapter;
export { createNativeStorage as createWebStorage };
