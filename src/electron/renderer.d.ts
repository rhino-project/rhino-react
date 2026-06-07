import type { StorageAdapter } from '../lib/storage';

export interface InitElectronStorageOptions {
  /** Keys to preload into the cache (defaults to Rhino's token/user/org keys). */
  keys?: string[];
  /** Must match the preload's `apiKey` (default `'rhino'`). */
  apiKey?: string;
}

/** Hydrate the in-memory cache from the main-process secure store. Call once at boot. */
export function initElectronStorage(options?: InitElectronStorageOptions): Promise<void>;

export interface CreateElectronStorageOptions {
  /** Must match the preload's `apiKey`. */
  apiKey?: string;
}

/** Create a synchronous storage adapter for `configureApi({ storage })`. */
export function createElectronStorage(options?: CreateElectronStorageOptions): StorageAdapter;

/** Test/advanced helper: clear the in-memory cache (does not touch the main store). */
export function _resetElectronStorageCache(): void;
