export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function initStorage(): Promise<void>;
export function createNativeStorage(): StorageAdapter;
/** Swap the active storage adapter at runtime (pass null to reset to the default). */
export function setStorageAdapter(adapter: StorageAdapter | null): void;
/** Get the currently active storage adapter. */
export function getStorageAdapter(): StorageAdapter;
export declare const storage: StorageAdapter;
export { createNativeStorage as createWebStorage };
