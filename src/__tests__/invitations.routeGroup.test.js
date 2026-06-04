import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { useInviteUser, useAcceptInvitation } from '../hooks/useInvitations';

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

describe('useInviteUser – route_group', () => {
  it('includes route_group in the payload when provided', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@test.com', role_id: 3, route_group: 'driver' });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations', {
      email: 'new@test.com',
      role_id: 3,
      route_group: 'driver',
    });
  });

  it('omits route_group from the payload when not provided (back-compat)', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@test.com', role_id: 3 });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations', {
      email: 'new@test.com',
      role_id: 3,
    });
  });
});

describe('useAcceptInvitation – route_group', () => {
  it('accepts a bare token string (back-compat) and posts only token', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('invite-token');
    });

    expect(api.post).toHaveBeenCalledWith('/invitations/accept', { token: 'invite-token' });
  });

  it('propagates route_group when given an object payload', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ token: 'invite-token', route_group: 'driver' });
    });

    expect(api.post).toHaveBeenCalledWith('/invitations/accept', {
      token: 'invite-token',
      route_group: 'driver',
    });
  });

  it('persists route_group from the accept response', async () => {
    api.post.mockResolvedValue({ data: { route_group: 'driver', user: { id: 1 } } });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ token: 't' });
    });

    expect(localStorage.getItem('route_group')).toBe('driver');
  });
});
