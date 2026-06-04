import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
  configureApi: vi.fn(),
  buildAuthPath: (action, routeGroup) =>
    routeGroup ? `/${routeGroup}/auth/${action}` : `/auth/${action}`,
}));

import api, { configureApi } from '../lib/axios';

const wrapper = ({ children }) => createElement(AuthProvider, null, children);
const groupWrapper = (group) => ({ children }) =>
  createElement(AuthProvider, { routeGroup: group }, children);

describe('AuthContext – group-aware auth URLs', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('login posts to /auth/login by default (back-compat)', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('a@b.com', 'p');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'p' });
  });

  it('logout posts to /auth/logout by default (back-compat)', async () => {
    api.post.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('uses the provider routeGroup for login/logout URLs', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper: groupWrapper('driver') });

    await act(async () => {
      await result.current.login('a@b.com', 'p');
    });
    expect(api.post).toHaveBeenCalledWith('/driver/auth/login', { email: 'a@b.com', password: 'p' });

    await act(async () => {
      await result.current.logout();
    });
    expect(api.post).toHaveBeenCalledWith('/driver/auth/logout');
  });

  it('registers the provider routeGroup with the API client via configureApi', () => {
    renderHook(() => useAuth(), { wrapper: groupWrapper('driver') });
    expect(configureApi).toHaveBeenCalledWith({ routeGroup: 'driver' });
  });

  it('honors a per-call routeGroup override on login', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper: groupWrapper('driver') });

    await act(async () => {
      await result.current.login('a@b.com', 'p', { routeGroup: 'admin' });
    });

    expect(api.post).toHaveBeenCalledWith('/admin/auth/login', { email: 'a@b.com', password: 'p' });
  });
});

describe('AuthContext – route group persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('stores route_group from the login response', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok', route_group: 'driver' } });
    const { result } = renderHook(() => useAuth(), { wrapper });

    let res;
    await act(async () => {
      res = await result.current.login('a@b.com', 'p');
    });

    expect(res.route_group).toBe('driver');
    expect(localStorage.getItem('route_group')).toBe('driver');
  });

  it('falls back to the route group used for the call when the response omits it', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper: groupWrapper('driver') });

    let res;
    await act(async () => {
      res = await result.current.login('a@b.com', 'p');
    });

    expect(res.route_group).toBe('driver');
    expect(localStorage.getItem('route_group')).toBe('driver');
  });

  it('does not store a route group when none is used or returned (back-compat)', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper });

    let res;
    await act(async () => {
      res = await result.current.login('a@b.com', 'p');
    });

    expect(res.route_group).toBeNull();
    expect(localStorage.getItem('route_group')).toBeNull();
  });

  it('clears route_group on logout', async () => {
    localStorage.setItem('route_group', 'driver');
    api.post.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('route_group')).toBeNull();
  });

  it('setRouteGroup stores and clears the route group', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.setRouteGroup('admin');
    });
    expect(localStorage.getItem('route_group')).toBe('admin');

    act(() => {
      result.current.setRouteGroup(null);
    });
    expect(localStorage.getItem('route_group')).toBeNull();
  });
});

describe('AuthContext – rejected login (lifecycle hook reject)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('stores no token and returns failure on a 403 reject', async () => {
    api.post.mockRejectedValue({
      response: { status: 403, data: { message: 'Login rejected by group policy' } },
    });
    const { result } = renderHook(() => useAuth(), { wrapper: groupWrapper('driver') });

    let res;
    await act(async () => {
      res = await result.current.login('a@b.com', 'p');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Login rejected by group policy');
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('route_group')).toBeNull();
  });
});
