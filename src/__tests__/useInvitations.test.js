import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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
import {
  useInvitations,
  useInviteUser,
  useResendInvitation,
  useCancelInvitation,
  useAcceptInvitation,
} from '../hooks/useInvitations';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useInvitations ──────────────────────────────────────────────────────────

describe('useInvitations', () => {
  it('should return error when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });

    expect(result.current.error.message).toBe('Organization slug is required');
    expect(result.current.isError).toBe(true);
  });

  it('should GET /org/invitations when status is all', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations');
  });

  it('should GET /org/invitations with status param when filtered', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations('pending'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations?status=pending');
  });

  it('should not call api when organization is null', () => {
    useOrganization.mockReturnValue(null);
    renderHook(() => useInvitations(), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ─── useInviteUser ───────────────────────────────────────────────────────────

describe('useInviteUser', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useInviteUser(), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should POST to /org/invitations with email and role_id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: 'user@test.com', role_id: 2 });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations', {
      email: 'user@test.com',
      role_id: 2,
    });
  });

  it('should invalidate invitations queries on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useInviteUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: 'user@test.com', role_id: 2 });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invitations', 'my-org'] });
  });
});

// ─── useResendInvitation ─────────────────────────────────────────────────────

describe('useResendInvitation', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useResendInvitation(), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should POST to /org/invitations/id/resend', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useResendInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations/5/resend');
  });

  it('should invalidate invitations queries on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useResendInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invitations', 'my-org'] });
  });
});

// ─── useCancelInvitation ─────────────────────────────────────────────────────

describe('useCancelInvitation', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useCancelInvitation(), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should DELETE /org/invitations/id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useCancelInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(api.delete).toHaveBeenCalledWith('/my-org/invitations/5');
  });

  it('should invalidate invitations queries on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCancelInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invitations', 'my-org'] });
  });
});

// ─── useAcceptInvitation ─────────────────────────────────────────────────────

describe('useAcceptInvitation', () => {
  it('should POST to /invitations/accept with token and no org prefix', async () => {
    useOrganization.mockReturnValue(null); // No org needed for public route
    api.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('abc-token-123');
    });

    expect(api.post).toHaveBeenCalledWith('/invitations/accept', { token: 'abc-token-123' });
  });

  it('should invalidate modelIndex users queries on success', async () => {
    useOrganization.mockReturnValue(null);
    api.post.mockResolvedValue({ data: { success: true } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('abc-token-123');
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
  });
});
