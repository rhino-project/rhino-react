import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api, { configureApi, buildAuthPath, getRouteGroup, getTenancy } from '../lib/axios';

describe('axios – configureApi({ tenancy }) / getTenancy', () => {
  afterEach(() => {
    // Restore the default so other suites are unaffected
    configureApi({ tenancy: 'path' });
  });

  it('defaults to path-prefix tenancy', () => {
    expect(getTenancy()).toBe('path');
  });

  it('switches to subdomain tenancy', () => {
    configureApi({ tenancy: 'subdomain' });
    expect(getTenancy()).toBe('subdomain');
  });

  it('switches back to path tenancy', () => {
    configureApi({ tenancy: 'subdomain' });
    expect(getTenancy()).toBe('subdomain');
    configureApi({ tenancy: 'path' });
    expect(getTenancy()).toBe('path');
  });

  it('treats any non-"subdomain" value (incl. null/undefined) as path', () => {
    configureApi({ tenancy: null });
    expect(getTenancy()).toBe('path');
    configureApi({ tenancy: undefined });
    expect(getTenancy()).toBe('path');
    configureApi({ tenancy: 'bogus' });
    expect(getTenancy()).toBe('path');
  });

  it('leaves tenancy unchanged when the key is absent', () => {
    configureApi({ tenancy: 'subdomain' });
    configureApi({ baseURL: '/api' }); // no tenancy key
    expect(getTenancy()).toBe('subdomain');
  });
});

describe('axios – buildAuthPath / getRouteGroup', () => {
  afterEach(() => {
    // Reset configured route group between tests
    configureApi({ routeGroup: null });
  });

  it('builds default /auth/* paths when no route group is configured', () => {
    configureApi({ routeGroup: null });
    expect(buildAuthPath('login')).toBe('/auth/login');
    expect(buildAuthPath('logout')).toBe('/auth/logout');
    expect(buildAuthPath('register')).toBe('/auth/register');
    expect(buildAuthPath('password/recover')).toBe('/auth/password/recover');
    expect(buildAuthPath('password/reset')).toBe('/auth/password/reset');
  });

  it('builds group-prefixed paths when a route group is configured', () => {
    configureApi({ routeGroup: 'driver' });
    expect(getRouteGroup()).toBe('driver');
    expect(buildAuthPath('login')).toBe('/driver/auth/login');
    expect(buildAuthPath('password/recover')).toBe('/driver/auth/password/recover');
  });

  it('honors a per-call route group override', () => {
    configureApi({ routeGroup: 'driver' });
    // Explicit override wins over the configured group
    expect(buildAuthPath('login', 'admin')).toBe('/admin/auth/login');
    // Explicit null override falls back to default path
    expect(buildAuthPath('login', null)).toBe('/auth/login');
  });

  it('configureApi clears the route group with null', () => {
    configureApi({ routeGroup: 'driver' });
    expect(getRouteGroup()).toBe('driver');
    configureApi({ routeGroup: null });
    expect(getRouteGroup()).toBeNull();
  });
});

describe('axios – 403 / onForbidden handling', () => {
  let responseErrorHandler;

  beforeEach(() => {
    localStorage.clear();
    responseErrorHandler = api.interceptors.response.handlers[0].rejected;
  });

  afterEach(() => {
    configureApi({ baseURL: '/api' });
  });

  it('calls onForbidden on 403 and does NOT clear the token', async () => {
    localStorage.setItem('token', 'valid-token');
    const onForbidden = vi.fn();
    configureApi({ onForbidden });

    const error403 = {
      response: { status: 403, data: { code: 'membership_denied', message: 'Not a member' } },
      message: 'Forbidden',
    };

    await expect(responseErrorHandler(error403)).rejects.toBe(error403);
    expect(onForbidden).toHaveBeenCalledWith(error403);
    // Token preserved — the user is authenticated, just not a group member
    expect(localStorage.getItem('token')).toBe('valid-token');

    configureApi({ onForbidden: null });
  });

  it('surfaces the membership-denied body to onForbidden', async () => {
    const onForbidden = vi.fn();
    configureApi({ onForbidden });

    const error403 = {
      response: { status: 403, data: { code: 'membership_denied', message: 'You are not a member of this group' } },
      message: 'Forbidden',
    };

    await expect(responseErrorHandler(error403)).rejects.toBe(error403);
    const received = onForbidden.mock.calls[0][0];
    expect(received.response.data.code).toBe('membership_denied');
    expect(received.response.data.message).toBe('You are not a member of this group');

    configureApi({ onForbidden: null });
  });

  it('does not throw on 403 when no onForbidden is configured', async () => {
    configureApi({ onForbidden: null });
    localStorage.setItem('token', 'valid-token');

    const error403 = { response: { status: 403 }, message: 'Forbidden' };

    await expect(responseErrorHandler(error403)).rejects.toBe(error403);
    expect(localStorage.getItem('token')).toBe('valid-token');
  });

  it('401 still clears the token (unchanged behavior) and does not call onForbidden', async () => {
    localStorage.setItem('token', 'expired-token');
    const onForbidden = vi.fn();
    const onUnauthorized = vi.fn();
    configureApi({ onForbidden, onUnauthorized });

    const error401 = { response: { status: 401 }, message: 'Unauthorized' };

    await expect(responseErrorHandler(error401)).rejects.toBe(error401);
    expect(localStorage.getItem('token')).toBeNull();
    expect(onUnauthorized).toHaveBeenCalled();
    expect(onForbidden).not.toHaveBeenCalled();

    configureApi({ onForbidden: null, onUnauthorized: null });
  });
});
