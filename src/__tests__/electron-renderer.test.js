import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createElectronStorage,
  initElectronStorage,
  _resetElectronStorageCache,
} from '../electron/renderer';

// In-memory async bridge that mimics what the preload exposes on window.rhino.storage.
function installBridge(initial = {}, apiKey = 'rhino') {
  const store = { ...initial };
  globalThis[apiKey] = {
    storage: {
      get: (k) => Promise.resolve(k in store ? store[k] : null),
      set: (k, v) => {
        store[k] = String(v);
        return Promise.resolve(true);
      },
      remove: (k) => {
        delete store[k];
        return Promise.resolve(true);
      },
      getMany: (keys) => {
        const out = {};
        for (const k of keys) if (k in store) out[k] = store[k];
        return Promise.resolve(out);
      },
      clear: () => Promise.resolve(true),
    },
    _store: store,
  };
  return store;
}

describe('Electron renderer storage adapter', () => {
  beforeEach(() => {
    _resetElectronStorageCache();
  });

  afterEach(() => {
    delete globalThis.rhino;
    delete globalThis.myapp;
    _resetElectronStorageCache();
  });

  it('serves reads from cache only after hydration', async () => {
    installBridge({ token: 't1', user: '{"id":1}' });
    const storage = createElectronStorage();

    // Cache empty before init.
    expect(storage.getItem('token')).toBeNull();

    await initElectronStorage();
    expect(storage.getItem('token')).toBe('t1');
    expect(storage.getItem('user')).toBe('{"id":1}');
    expect(storage.getItem('missing')).toBeNull();
  });

  it('writes through to the bridge and updates the cache synchronously', async () => {
    const store = installBridge();
    await initElectronStorage();
    const storage = createElectronStorage();

    storage.setItem('token', 'new');
    // Cache reflects it immediately (sync API).
    expect(storage.getItem('token')).toBe('new');
    // Bridge received the async write.
    await Promise.resolve();
    expect(store.token).toBe('new');

    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
    await Promise.resolve();
    expect('token' in store).toBe(false);
  });

  it('only hydrates the requested keys', async () => {
    installBridge({ token: 't', user: 'u', extra: 'e' });
    await initElectronStorage({ keys: ['token'] });
    const storage = createElectronStorage();
    expect(storage.getItem('token')).toBe('t');
    expect(storage.getItem('user')).toBeNull();
  });

  it('supports a custom apiKey', async () => {
    installBridge({ token: 'k' }, 'myapp');
    await initElectronStorage({ apiKey: 'myapp' });
    const storage = createElectronStorage();
    expect(storage.getItem('token')).toBe('k');
  });

  it('throws if the preload bridge is missing', async () => {
    await expect(initElectronStorage()).rejects.toThrow(/rhino\.storage was not found/);
  });
});
