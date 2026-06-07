/**
 * Storage adapter for web (localStorage).
 * On React Native, Metro bundler will resolve storage.native.js instead.
 */

/**
 * Create a web storage adapter backed by localStorage.
 * @returns {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }}
 */
export function createWebStorage() {
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  };
}

// The active adapter. Defaults to localStorage but can be swapped at runtime
// (e.g. `configureApi({ storage })` to plug in Electron secure storage, or a
// custom store in tests). The `storage` export below delegates to whatever is
// active here, so swapping is reflected everywhere the reference is used.
let activeAdapter = createWebStorage();

/**
 * Swap the active storage adapter at runtime. Every read/write through the
 * exported `storage` proxy is routed to this adapter. Pass `null`/`undefined`
 * to reset to the platform default (localStorage on web).
 *
 * @param {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }|null} [adapter]
 */
export function setStorageAdapter(adapter) {
  activeAdapter = adapter || createWebStorage();
}

/**
 * Get the currently active storage adapter (advanced/testing).
 * @returns {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }}
 */
export function getStorageAdapter() {
  return activeAdapter;
}

/**
 * No-op on web — localStorage is synchronous and requires no initialization.
 * Provided for cross-platform compatibility with React Native's initStorage().
 * @returns {Promise<void>}
 */
export async function initStorage() {
  // No-op on web — localStorage is synchronous
}

/**
 * Default storage instance. A stable proxy that always delegates to the active
 * adapter, so a later `setStorageAdapter()` is honored by every module that
 * imported `storage`.
 */
export const storage = {
  getItem: (key) => activeAdapter.getItem(key),
  setItem: (key, value) => activeAdapter.setItem(key, value),
  removeItem: (key) => activeAdapter.removeItem(key),
};
