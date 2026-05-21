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

/**
 * No-op on web — localStorage is synchronous and requires no initialization.
 * Provided for cross-platform compatibility with React Native's initStorage().
 * @returns {Promise<void>}
 */
export async function initStorage() {
  // No-op on web — localStorage is synchronous
}

/** Default storage instance for web */
export const storage = createWebStorage();
