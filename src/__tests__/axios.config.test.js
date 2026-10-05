import { describe, it, expect, afterEach, vi } from 'vitest';
import api, { configureApi } from '../lib/axios';
import { stubAdapter } from './helpers/realApi';

afterEach(() => {
  api.defaults.timeout = 0;
  api.defaults.withCredentials = true;
  vi.useRealTimers();
});

describe('configureApi — timeout and withCredentials', () => {
  it('defaults are unchanged: cookies on, no timeout', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout || 0).toBe(0);
  });

  it('an unrelated configureApi call leaves them alone', () => {
    configureApi({ baseURL: '/api' });
    configureApi({});
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout || 0).toBe(0);
  });

  it('sets both on the instance defaults', () => {
    configureApi({ timeout: 25000, withCredentials: false });
    expect(api.defaults.timeout).toBe(25000);
    expect(api.defaults.withCredentials).toBe(false);
  });

  it('applies them to requests', async () => {
    configureApi({ timeout: 25000, withCredentials: false });
    const requests = stubAdapter();
    await api.get('/acme/posts');
    expect(requests[0].timeout).toBe(25000);
    expect(requests[0].withCredentials).toBe(false);
  });

  it('withCredentials can be turned back on, and timeout: 0 clears the timeout', () => {
    configureApi({ timeout: 25000, withCredentials: false });
    configureApi({ timeout: 0, withCredentials: true });
    expect(api.defaults.timeout).toBe(0);
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('ignores undefined and non-boolean/non-number values', () => {
    configureApi({ timeout: 25000, withCredentials: false });
    configureApi({ timeout: undefined, withCredentials: undefined });
    configureApi({ timeout: '10', withCredentials: 'yes' });
    expect(api.defaults.timeout).toBe(25000);
    expect(api.defaults.withCredentials).toBe(false);
  });
});

describe('401 default handler', () => {
  it('does not throw where window has no location (React Native)', async () => {
    configureApi({ onUnauthorized: null });
    const rejected = api.interceptors.response.handlers[0].rejected;
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', { configurable: true, value: undefined });
    const error = { response: { status: 401 }, config: { url: '/acme/posts' } };
    try {
      await expect(rejected(error)).rejects.toBe(error);
    } finally {
      Object.defineProperty(window, 'location', original);
    }
  });
});
