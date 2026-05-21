/**
 * Tests for the React Native storage adapter pattern.
 *
 * We can't directly import storage.native.js because it depends on
 * @react-native-async-storage/async-storage which is not available in jsdom.
 * Instead, we test the synchronous in-memory cache pattern that the adapter uses.
 *
 * The native storage adapter works by:
 * 1. Maintaining an in-memory cache object
 * 2. getItem reads from cache (sync)
 * 3. setItem writes to cache (sync) + fires AsyncStorage.setItem (async, fire-and-forget)
 * 4. removeItem deletes from cache (sync) + fires AsyncStorage.removeItem (async)
 * 5. initStorage preloads the cache from AsyncStorage on app start
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Recreate the native storage pattern for testing,
 * since we cannot import the actual file without the RN dependency.
 */
function createMockNativeStorage() {
  const cache = {};
  const mockAsyncStorage = {
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    multiGet: vi.fn().mockResolvedValue([]),
  };

  const storage = {
    getItem: (key) => cache[key] ?? null,
    setItem: (key, value) => {
      cache[key] = value;
      mockAsyncStorage.setItem(key, value).catch(() => {});
    },
    removeItem: (key) => {
      delete cache[key];
      mockAsyncStorage.removeItem(key).catch(() => {});
    },
  };

  const initStorage = async (keys) => {
    const pairs = await mockAsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value !== null) {
        cache[key] = value;
      }
    }
  };

  return { storage, initStorage, mockAsyncStorage, cache };
}

describe('Native Storage Adapter – cache pattern', () => {
  let storage, initStorage, mockAsyncStorage, cache;

  beforeEach(() => {
    ({ storage, initStorage, mockAsyncStorage, cache } = createMockNativeStorage());
  });

  it('getItem should return null for unknown keys', () => {
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('setItem should store in memory cache synchronously', () => {
    storage.setItem('token', 'jwt-123');
    expect(storage.getItem('token')).toBe('jwt-123');
  });

  it('setItem should call async storage in background', () => {
    storage.setItem('token', 'jwt-123');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('token', 'jwt-123');
  });

  it('removeItem should remove from memory cache', () => {
    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');

    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('removeItem should call async storage in background', () => {
    storage.removeItem('token');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should handle multiple keys independently', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.setItem('c', '3');

    expect(storage.getItem('a')).toBe('1');
    expect(storage.getItem('b')).toBe('2');
    expect(storage.getItem('c')).toBe('3');

    storage.removeItem('b');
    expect(storage.getItem('a')).toBe('1');
    expect(storage.getItem('b')).toBeNull();
    expect(storage.getItem('c')).toBe('3');
  });

  it('setItem should overwrite existing values', () => {
    storage.setItem('key', 'old');
    storage.setItem('key', 'new');
    expect(storage.getItem('key')).toBe('new');
  });

  it('should handle async storage setItem failure gracefully', async () => {
    mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));
    // Should not throw synchronously
    expect(() => storage.setItem('key', 'value')).not.toThrow();
    // Value should still be in cache
    expect(storage.getItem('key')).toBe('value');
  });

  it('should handle async storage removeItem failure gracefully', async () => {
    mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
    storage.setItem('key', 'value');
    // Should not throw synchronously
    expect(() => storage.removeItem('key')).not.toThrow();
    // Value should still be removed from cache
    expect(storage.getItem('key')).toBeNull();
  });
});

describe('Native Storage – initStorage', () => {
  let storage, initStorage, mockAsyncStorage;

  beforeEach(() => {
    ({ storage, initStorage, mockAsyncStorage } = createMockNativeStorage());
  });

  it('should load keys from async storage into cache', async () => {
    mockAsyncStorage.multiGet.mockResolvedValue([
      ['token', 'jwt-123'],
      ['user', '{"id":1}'],
      ['organization_slug', 'my-org'],
      ['last_organization', 'my-org'],
    ]);

    const keys = ['token', 'user', 'organization_slug', 'last_organization'];
    await initStorage(keys);

    expect(storage.getItem('token')).toBe('jwt-123');
    expect(storage.getItem('user')).toBe('{"id":1}');
    expect(storage.getItem('organization_slug')).toBe('my-org');
    expect(storage.getItem('last_organization')).toBe('my-org');
  });

  it('should skip null values from async storage', async () => {
    mockAsyncStorage.multiGet.mockResolvedValue([
      ['token', null],
      ['user', 'data'],
    ]);

    await initStorage(['token', 'user']);

    expect(storage.getItem('token')).toBeNull();
    expect(storage.getItem('user')).toBe('data');
  });

  it('should call multiGet with provided keys', async () => {
    mockAsyncStorage.multiGet.mockResolvedValue([]);
    const keys = ['token', 'user'];

    await initStorage(keys);

    expect(mockAsyncStorage.multiGet).toHaveBeenCalledWith(keys);
  });

  it('should handle empty response from multiGet', async () => {
    mockAsyncStorage.multiGet.mockResolvedValue([]);

    await initStorage(['token']);

    expect(storage.getItem('token')).toBeNull();
  });

  it('should preserve pre-existing cache entries', async () => {
    storage.setItem('existing', 'value');
    mockAsyncStorage.multiGet.mockResolvedValue([
      ['token', 'new-token'],
    ]);

    await initStorage(['token']);

    expect(storage.getItem('existing')).toBe('value');
    expect(storage.getItem('token')).toBe('new-token');
  });
});
