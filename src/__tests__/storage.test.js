import { describe, it, expect, beforeEach } from 'vitest';
import { createWebStorage, storage } from '../lib/storage';

describe('Web Storage Adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should export a default storage instance', () => {
    expect(storage).toBeDefined();
    expect(storage.getItem).toBeTypeOf('function');
    expect(storage.setItem).toBeTypeOf('function');
    expect(storage.removeItem).toBeTypeOf('function');
  });

  it('should return null for non-existent keys', () => {
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('should store and retrieve values', () => {
    storage.setItem('token', 'abc123');
    expect(storage.getItem('token')).toBe('abc123');
  });

  it('should remove values', () => {
    storage.setItem('token', 'abc123');
    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
  });

  it('should overwrite existing values', () => {
    storage.setItem('token', 'old');
    storage.setItem('token', 'new');
    expect(storage.getItem('token')).toBe('new');
  });

  it('createWebStorage should return independent instances backed by localStorage', () => {
    const s1 = createWebStorage();
    const s2 = createWebStorage();

    s1.setItem('key', 'value');
    // Both read from the same localStorage
    expect(s2.getItem('key')).toBe('value');
  });
});
