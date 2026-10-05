import { vi } from 'vitest';

/**
 * In-memory stand-in for `@react-native-async-storage/async-storage`, which is
 * not installed here (it is an optional peer). `vitest.config.js` aliases the
 * package to this file so tests can import the real `storage.native.js`.
 */
// Kept on globalThis so it survives `vi.resetModules()`, the way a device's
// storage survives an app restart.
export const disk = (globalThis.__rhinoAsyncStorageDisk ??= { values: {} });

export default {
  multiGet: vi.fn(async (keys) => keys.map((key) => [key, disk.values[key] ?? null])),
  setItem: vi.fn(async (key, value) => { disk.values[key] = value; }),
  removeItem: vi.fn(async (key) => { delete disk.values[key]; }),
};
