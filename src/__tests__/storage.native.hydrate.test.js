import { describe, it, expect, beforeEach, vi } from 'vitest';

// The real React Native adapter, with AsyncStorage aliased to an in-memory fake
// (see vitest.config.js).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { disk } from './helpers/asyncStorageFake';
import * as native from '../lib/storage.native';
import * as web from '../lib/storage';
import { STORAGE_KEYS } from '../lib/storage-keys';

beforeEach(() => {
  vi.clearAllMocks();
  disk.values = {};
  STORAGE_KEYS.forEach((key) => native.storage.removeItem(key));
});

describe('storage.native — initStorage()', () => {
  it('hydrates route_group', async () => {
    disk.values = { route_group: 'driver' };
    expect(native.storage.getItem('route_group')).toBeNull();

    await native.initStorage();

    expect(native.storage.getItem('route_group')).toBe('driver');
  });

  it('hydrates every key in STORAGE_KEYS, and asks AsyncStorage for exactly that list', async () => {
    disk.values = Object.fromEntries(STORAGE_KEYS.map((key) => [key, `value-of-${key}`]));

    await native.initStorage();

    expect(AsyncStorage.multiGet).toHaveBeenCalledWith([...STORAGE_KEYS]);
    for (const key of STORAGE_KEYS) {
      expect(native.storage.getItem(key)).toBe(`value-of-${key}`);
    }
  });

  it('leaves keys absent from AsyncStorage as null', async () => {
    disk.values = { token: 't' };
    await native.initStorage();
    expect(native.storage.getItem('token')).toBe('t');
    expect(native.storage.getItem('route_group')).toBeNull();
  });
});

describe('STORAGE_KEYS', () => {
  it('lists every key the library writes', () => {
    expect([...STORAGE_KEYS]).toEqual(['token', 'user', 'organization_slug', 'last_organization', 'route_group']);
  });

  it('is the same constant on both platforms', () => {
    expect(native.STORAGE_KEYS).toBe(STORAGE_KEYS);
    expect(web.STORAGE_KEYS).toBe(STORAGE_KEYS);
  });
});

describe('platform files keep the same exports', () => {
  it('storage.native exports everything storage exports', () => {
    for (const name of Object.keys(web)) {
      expect(native[name], name).toBeTypeOf(typeof web[name]);
    }
  });

  it('events.native exports everything events exports', async () => {
    const webEvents = await import('../lib/events');
    const nativeEvents = await import('../lib/events.native');
    for (const name of Object.keys(webEvents)) {
      expect(nativeEvents[name], name).toBeTypeOf(typeof webEvents[name]);
    }
  });
});
