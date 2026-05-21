/**
 * Storage adapter for React Native (AsyncStorage).
 * Metro bundler automatically picks this file over storage.js on React Native.
 *
 * Note: AsyncStorage is async but this adapter provides a synchronous API
 * by keeping an in-memory cache that syncs to AsyncStorage in the background.
 * Call `await initStorage()` once at app startup before rendering.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const cache = {};
let initialized = false;

/**
 * Initialize storage by loading all keys from AsyncStorage into memory.
 * Call this once at app startup before rendering (e.g., in a splash screen).
 *
 * @example
 * import { initStorage } from '@rhino-project/rhino-react';
 *
 * async function bootstrap() {
 *   await initStorage();
 *   // Now render your app
 * }
 */
export async function initStorage() {
  const keys = ['token', 'user', 'organization_slug', 'last_organization'];
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value !== null) {
      cache[key] = value;
    }
  }
  initialized = true;
}

/**
 * Create a React Native storage adapter backed by AsyncStorage with in-memory cache.
 * @returns {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }}
 */
export function createNativeStorage() {
  return {
    getItem: (key) => {
      return cache[key] ?? null;
    },
    setItem: (key, value) => {
      cache[key] = value;
      AsyncStorage.setItem(key, value).catch((err) =>
        console.warn('Rhino: AsyncStorage.setItem failed:', err)
      );
    },
    removeItem: (key) => {
      delete cache[key];
      AsyncStorage.removeItem(key).catch((err) =>
        console.warn('Rhino: AsyncStorage.removeItem failed:', err)
      );
    },
  };
}

/** Default storage instance for React Native */
export const storage = createNativeStorage();

// Re-export createNativeStorage as createWebStorage for import compatibility
export { createNativeStorage as createWebStorage };
