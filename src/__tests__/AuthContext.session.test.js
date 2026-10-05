import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import api, { configureApi } from '../lib/axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useRegister } from '../hooks/useAuthActions';
import { useAcceptInvitation } from '../hooks/useInvitations';
import { useOrganization } from '../hooks/useOrganization';
import { useModelIndex } from '../hooks/useModel';
import { useRouteGroup } from '../hooks/useRouteGroup';
import { stubAdapter, createClient } from './helpers/realApi';

// Real axios instance + real AuthProvider: the token travels storage ->
// request interceptor -> Authorization header exactly as in an app.

const authWrapper = ({ children }) => createElement(AuthProvider, null, children);
const fullWrapper = ({ children }) =>
  createElement(QueryClientProvider, { client: createClient() }, createElement(AuthProvider, null, children));

const bearer = (config) => config.headers.get('Authorization');

let onUnauthorized;

beforeEach(() => {
  localStorage.clear();
  onUnauthorized = vi.fn();
  configureApi({ onUnauthorized, routeGroup: null });
});

afterEach(() => {
  configureApi({ onUnauthorized: null, routeGroup: null });
});

describe('login() makes the token usable before it resolves', () => {
  it('a request issued in the same tick after await login() carries the bearer header', async () => {
    const requests = stubAdapter((config) =>
      config.url === '/auth/login'
        ? { data: { token: 'tok-1', user: { id: 1 }, organization_slug: 'acme' } }
        : { data: {} },
    );
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    let loginResult;
    let followUp;
    await act(async () => {
      loginResult = await result.current.login('a@b.c', 'secret');
      // No await between login resolving and this request: React has not
      // flushed the token state or its effect yet.
      followUp = api.post('/acme/devices', { push_token: 'p' });
      await followUp;
    });

    expect(requests.map((config) => config.url)).toEqual(['/auth/login', '/acme/devices']);
    expect(bearer(requests[0])).toBeUndefined();
    expect(bearer(requests[1])).toBe('Bearer tok-1');
    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBe('tok-1');
  });

  it('the token is in storage when login() resolves, before React flushes', async () => {
    stubAdapter(() => ({ data: { token: 'tok-1' } }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    let stored;
    await act(async () => {
      await result.current.login('a@b.c', 'secret');
      stored = localStorage.getItem('token');
    });

    expect(stored).toBe('tok-1');
    expect(result.current.token).toBe('tok-1');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('a failed login returns no token and stores none', async () => {
    stubAdapter(() => ({ status: 422, data: { message: 'Nope' } }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    let loginResult;
    await act(async () => { loginResult = await result.current.login('a@b.c', 'bad'); });

    expect(loginResult).toEqual({ success: false, error: 'Nope', status: 422 });
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('login() reaches hooks that are already mounted', () => {
  it('a data hook mounted before the login starts fetching once login() resolves', async () => {
    const requests = stubAdapter((config) =>
      config.url === '/auth/login'
        ? { data: { token: 'tok-1', organization_slug: 'acme' } }
        : { data: [{ id: 1 }] },
    );
    const { result } = renderHook(
      () => ({ auth: useAuth(), organization: useOrganization(), posts: useModelIndex('posts') }),
      { wrapper: fullWrapper },
    );
    expect(result.current.organization).toBeNull();
    expect(result.current.posts.fetchStatus).toBe('idle');

    await act(async () => { await result.current.auth.login('a@b.c', 'secret'); });

    await waitFor(() => expect(result.current.posts.isSuccess).toBe(true));
    expect(result.current.organization).toBe('acme');
    expect(requests.map((config) => config.url)).toEqual(['/auth/login', '/acme/posts']);
    expect(bearer(requests[1])).toBe('Bearer tok-1');
  });
});

describe('login() persists the route group it logged in through', () => {
  it('a group set only through configureApi is stored and reaches useRouteGroup()', async () => {
    configureApi({ routeGroup: 'driver' });
    const requests = stubAdapter(() => ({ data: { token: 'tok-1' } }));
    const { result } = renderHook(() => ({ auth: useAuth(), group: useRouteGroup() }), { wrapper: authWrapper });

    let loginResult;
    await act(async () => { loginResult = await result.current.auth.login('a@b.c', 'secret'); });

    expect(requests[0].url).toBe('/driver/auth/login');
    expect(loginResult.route_group).toBe('driver');
    expect(localStorage.getItem('route_group')).toBe('driver');
    expect(result.current.group).toBe('driver');
  });

  it('a per-call null override still means no group', async () => {
    configureApi({ routeGroup: 'driver' });
    stubAdapter(() => ({ data: { token: 'tok-1' } }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    let loginResult;
    await act(async () => { loginResult = await result.current.login('a@b.c', 'secret', { routeGroup: null }); });
    expect(loginResult.route_group).toBeNull();
    expect(localStorage.getItem('route_group')).toBeNull();
  });

  it('with no group configured anywhere nothing is stored (unchanged)', async () => {
    stubAdapter(() => ({ data: { token: 'tok-1' } }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    let loginResult;
    await act(async () => { loginResult = await result.current.login('a@b.c', 'secret'); });
    expect(loginResult.route_group).toBeNull();
    expect(localStorage.getItem('route_group')).toBeNull();
  });
});

describe('useRegister starts a session like login()', () => {
  it('stores token, user and organization before resolving and authenticates the provider', async () => {
    const requests = stubAdapter((config) =>
      config.url === '/auth/register'
        ? { status: 201, data: { token: 'tok-r', user: { id: 9 }, organization_slug: 'acme' } }
        : { data: {} },
    );
    const { result } = renderHook(() => ({ auth: useAuth(), register: useRegister() }), { wrapper: fullWrapper });
    expect(result.current.auth.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.register.mutateAsync({
        token: 'invite', name: 'N', email: 'a@b.c', password: 'p', password_confirmation: 'p',
      });
      await api.get('/acme/posts');
    });

    expect(bearer(requests[1])).toBe('Bearer tok-r');
    expect(localStorage.getItem('token')).toBe('tok-r');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 9 });
    expect(localStorage.getItem('organization_slug')).toBe('acme');
    expect(localStorage.getItem('last_organization')).toBe('acme');
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
    expect(result.current.auth.token).toBe('tok-r');
  });

  it('a response without a token leaves the session untouched', async () => {
    stubAdapter(() => ({ status: 201, data: { message: 'ok' } }));
    const { result } = renderHook(() => ({ auth: useAuth(), register: useRegister() }), { wrapper: fullWrapper });

    await act(async () => { await result.current.register.mutateAsync({ token: 'invite' }); });

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.auth.isAuthenticated).toBe(false);
  });
});

describe('useAcceptInvitation does not start a session', () => {
  it('leaves token and auth state alone', async () => {
    stubAdapter(() => ({ data: { requires_registration: true } }));
    const { result } = renderHook(() => ({ auth: useAuth(), accept: useAcceptInvitation() }), { wrapper: fullWrapper });

    await act(async () => { await result.current.accept.mutateAsync('invite-token'); });

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.auth.isAuthenticated).toBe(false);
  });
});

describe('a 401 resets the AuthProvider', () => {
  it('on a data request: isAuthenticated becomes false, storage is cleared, onUnauthorized runs once', async () => {
    localStorage.setItem('token', 'expired');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    localStorage.setItem('organization_slug', 'acme');
    stubAdapter(() => ({ status: 401, data: { message: 'Unauthenticated.' } }));

    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => { await api.get('/acme/posts').catch(() => {}); });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('settles without a loop between the event and the storage effect', async () => {
    localStorage.setItem('token', 'expired');
    stubAdapter(() => ({ status: 401 }));
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    let renders = 0;

    const { result } = renderHook(() => { renders += 1; return useAuth(); }, { wrapper: authWrapper });
    const before = renders;
    await act(async () => { await api.get('/acme/posts').catch(() => {}); });
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));

    expect(result.current.isAuthenticated).toBe(false);
    expect(renders - before).toBeLessThanOrEqual(3);
    // Once by the interceptor, once by the provider's effect.
    expect(removeItem.mock.calls.filter(([key]) => key === 'token')).toHaveLength(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    removeItem.mockRestore();
  });

  it('a 401 from login does neither: the session and onUnauthorized are untouched', async () => {
    localStorage.setItem('token', 'still-valid');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    stubAdapter(() => ({ status: 401, data: { message: 'Invalid credentials' } }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    let loginResult;
    await act(async () => { loginResult = await result.current.login('a@b.c', 'wrong'); });

    expect(loginResult).toEqual({ success: false, error: 'Invalid credentials', status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('still-valid');
    expect(localStorage.getItem('user')).not.toBeNull();
  });

  it('a 401 from a group login (configured or per-call group) is skipped too', async () => {
    localStorage.setItem('token', 'still-valid');
    const requests = stubAdapter(() => ({ status: 401 }));
    configureApi({ routeGroup: 'driver' });
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    await act(async () => {
      await result.current.login('a@b.c', 'wrong');
      await result.current.login('a@b.c', 'wrong', { routeGroup: 'client' });
    });

    expect(requests.map((config) => config.url)).toEqual(['/driver/auth/login', '/client/auth/login']);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('still-valid');
  });

  it('a 401 from another auth path (logout) is not skipped', async () => {
    localStorage.setItem('token', 'expired');
    stubAdapter(() => ({ status: 401 }));
    await api.post('/auth/logout').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('a model whose slug ends in "login" is not mistaken for the login endpoint', async () => {
    localStorage.setItem('token', 'expired');
    stubAdapter(() => ({ status: 401 }));
    await api.get('/acme/login').catch(() => {});
    await api.get('/acme/oauth/login-attempts').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('403 is unchanged: token kept, onForbidden called, no reset', async () => {
    localStorage.setItem('token', 'valid');
    const onForbidden = vi.fn();
    configureApi({ onForbidden });
    stubAdapter(() => ({ status: 403 }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });

    await act(async () => { await api.get('/acme/posts').catch(() => {}); });

    expect(onForbidden).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('valid');
    configureApi({ onForbidden: null });
  });
});
