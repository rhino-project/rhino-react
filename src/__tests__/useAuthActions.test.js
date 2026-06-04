import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
  buildAuthPath: (action, routeGroup) =>
    routeGroup ? `/${routeGroup}/auth/${action}` : `/auth/${action}`,
}));

import api from '../lib/axios';
import { useRegister, usePasswordRecover, useResetPassword } from '../hooks/useAuthActions';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useRegister', () => {
  it('POSTs to /auth/register with the registration payload (default group)', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok', user: { id: 1 } } });
    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        token: 'invite-token',
        name: 'Alice',
        email: 'a@b.com',
        password: 'secret',
        password_confirmation: 'secret',
      });
    });

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      token: 'invite-token',
      name: 'Alice',
      email: 'a@b.com',
      password: 'secret',
      password_confirmation: 'secret',
    });
    expect(data).toEqual({ token: 'tok', user: { id: 1 } });
  });

  it('uses a per-call routeGroup to build the URL', async () => {
    api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        token: 't',
        name: 'n',
        email: 'e',
        password: 'p',
        password_confirmation: 'p',
        routeGroup: 'driver',
      });
    });

    expect(api.post.mock.calls[0][0]).toBe('/driver/auth/register');
  });

  it('persists route_group from the register response', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok', route_group: 'driver' } });
    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        token: 't', name: 'n', email: 'e', password: 'p', password_confirmation: 'p',
      });
    });

    expect(localStorage.getItem('route_group')).toBe('driver');
  });

  it('propagates errors', async () => {
    api.post.mockRejectedValue(new Error('Token expired'));
    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          token: 't', name: 'n', email: 'e', password: 'p', password_confirmation: 'p',
        });
      }),
    ).rejects.toThrow('Token expired');
  });
});

describe('usePasswordRecover', () => {
  it('POSTs to /auth/password/recover with the email (default group)', async () => {
    api.post.mockResolvedValue({ data: { message: 'sent' } });
    const { result } = renderHook(() => usePasswordRecover(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ email: 'a@b.com' });
    });

    expect(api.post).toHaveBeenCalledWith('/auth/password/recover', { email: 'a@b.com' });
    expect(data).toEqual({ message: 'sent' });
  });

  it('uses a per-call routeGroup to build the URL', async () => {
    api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => usePasswordRecover(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com', routeGroup: 'driver' });
    });

    expect(api.post).toHaveBeenCalledWith('/driver/auth/password/recover', { email: 'a@b.com' });
  });
});

describe('useResetPassword', () => {
  it('POSTs to /auth/password/reset with the reset payload (default group)', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        token: 'reset-token',
        email: 'a@b.com',
        password: 'new-pass',
        password_confirmation: 'new-pass',
      });
    });

    expect(api.post).toHaveBeenCalledWith('/auth/password/reset', {
      token: 'reset-token',
      email: 'a@b.com',
      password: 'new-pass',
      password_confirmation: 'new-pass',
    });
    expect(data).toEqual({ success: true });
  });

  it('uses a per-call routeGroup to build the URL', async () => {
    api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        token: 't', email: 'e', password: 'p', password_confirmation: 'p', routeGroup: 'admin',
      });
    });

    expect(api.post.mock.calls[0][0]).toBe('/admin/auth/password/reset');
  });
});
