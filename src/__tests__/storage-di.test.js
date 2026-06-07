import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  storage,
  setStorageAdapter,
  getStorageAdapter,
  createWebStorage,
} from '../lib/storage';
import { configureApi } from '../lib/axios';

function memoryAdapter() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    _store: store,
  };
}

describe('Storage dependency injection', () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageAdapter(null); // reset to default web adapter
  });

  afterEach(() => {
    setStorageAdapter(null);
  });

  it('delegates to localStorage by default', () => {
    storage.setItem('token', 'abc');
    expect(localStorage.getItem('token')).toBe('abc');
    expect(storage.getItem('token')).toBe('abc');
  });

  it('routes reads/writes through an injected adapter', () => {
    const mem = memoryAdapter();
    setStorageAdapter(mem);

    storage.setItem('token', 'xyz');
    expect(mem._store.token).toBe('xyz');
    expect(storage.getItem('token')).toBe('xyz');
    // The default localStorage is untouched while the adapter is active.
    expect(localStorage.getItem('token')).toBeNull();

    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
  });

  it('setStorageAdapter(null) resets to the platform default', () => {
    const mem = memoryAdapter();
    setStorageAdapter(mem);
    expect(getStorageAdapter()).toBe(mem);

    setStorageAdapter(null);
    storage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('configureApi({ storage }) installs the adapter', () => {
    const mem = memoryAdapter();
    configureApi({ storage: mem });
    expect(getStorageAdapter()).toBe(mem);

    // The exported `storage` proxy (used by the axios interceptor) now uses it.
    storage.setItem('token', 'from-config');
    expect(mem._store.token).toBe('from-config');
  });

  it('getStorageAdapter returns an independent default instance after reset', () => {
    setStorageAdapter(null);
    const adapter = getStorageAdapter();
    expect(adapter.getItem).toBeTypeOf('function');
    // createWebStorage produces equivalent localStorage-backed adapters.
    const fresh = createWebStorage();
    fresh.setItem('shared', '1');
    expect(adapter.getItem('shared')).toBe('1');
  });
});
