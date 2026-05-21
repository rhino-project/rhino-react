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

function createWrapper(queryClient = null) {
  const qc = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useInvitations – Extended ──────────────────────────────────────────────────

describe('useInvitations – edge cases', () => {
  it('should return error object when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });

    expect(result.current.isError).toBe(true);
    expect(result.current.error.message).toBe('Organization slug is required');
    expect(result.current.data).toBeNull();
  });

  it('should fetch all invitations by default (status=all)', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [{ id: 1, email: 'a@b.com', status: 'pending' }] });

    renderHook(() => useInvitations(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations');
  });

  it('should fetch invitations with pending status filter', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations('pending'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations?status=pending');
  });

  it('should fetch invitations with accepted status filter', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations('accepted'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations?status=accepted');
  });

  it('should fetch invitations with expired status filter', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations('expired'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations?status=expired');
  });

  it('should fetch invitations with cancelled status filter', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useInvitations('cancelled'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/invitations?status=cancelled');
  });

  it('should return data from API response', async () => {
    useOrganization.mockReturnValue('my-org');
    const invitations = [
      { id: 1, email: 'a@test.com', status: 'pending' },
      { id: 2, email: 'b@test.com', status: 'accepted' },
    ];
    api.get.mockResolvedValue({ data: invitations });

    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toEqual(invitations);
  });

  it('should handle API errors', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockRejectedValue(new Error('Server Error'));

    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Server Error');
  });

  it('should provide a refetch function when no org', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });
    expect(result.current.refetch).toBeTypeOf('function');
  });
});

// ─── useInviteUser – Extended ───────────────────────────────────────────────────

describe('useInviteUser – edge cases', () => {
  it('should POST with email and role_id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1, email: 'new@test.com', role_id: 3 } });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@test.com', role_id: 3 });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations', {
      email: 'new@test.com',
      role_id: 3,
    });
  });

  it('should return invitation data from response', async () => {
    useOrganization.mockReturnValue('my-org');
    const invitation = { id: 5, email: 'user@test.com', status: 'pending' };
    api.post.mockResolvedValue({ data: invitation });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ email: 'user@test.com', role_id: 1 });
    });

    expect(data).toEqual(invitation);
  });

  it('should propagate validation errors', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockRejectedValue(new Error('Email already invited'));

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ email: 'dup@test.com', role_id: 1 });
      }),
    ).rejects.toThrow('Email already invited');
  });

  it('should invalidate invitations queries on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com', role_id: 1 });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invitations', 'my-org'] });
  });
});

// ─── useResendInvitation – Extended ─────────────────────────────────────────────

describe('useResendInvitation – edge cases', () => {
  it('should POST to resend endpoint with invitation id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useResendInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/invitations/42/resend');
  });

  it('should return response data', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { message: 'Invitation resent' } });

    const { result } = renderHook(() => useResendInvitation(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(1);
    });

    expect(data).toEqual({ message: 'Invitation resent' });
  });

  it('should handle expired invitation error', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockRejectedValue(new Error('Invitation has expired'));

    const { result } = renderHook(() => useResendInvitation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync(1);
      }),
    ).rejects.toThrow('Invitation has expired');
  });
});

// ─── useCancelInvitation – Extended ─────────────────────────────────────────────

describe('useCancelInvitation – edge cases', () => {
  it('should DELETE invitation by id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useCancelInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(api.delete).toHaveBeenCalledWith('/my-org/invitations/42');
  });

  it('should return response data on cancel', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: { cancelled: true } });

    const { result } = renderHook(() => useCancelInvitation(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(1);
    });

    expect(data).toEqual({ cancelled: true });
  });

  it('should propagate errors', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockRejectedValue(new Error('Cannot cancel accepted invitation'));

    const { result } = renderHook(() => useCancelInvitation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync(1);
      }),
    ).rejects.toThrow('Cannot cancel accepted invitation');
  });

  it('should invalidate invitations queries on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelInvitation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invitations', 'my-org'] });
  });
});

// ─── useAcceptInvitation – Extended ─────────────────────────────────────────────

describe('useAcceptInvitation – edge cases', () => {
  it('should POST token to /invitations/accept (public route)', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('invitation-token-abc');
    });

    expect(api.post).toHaveBeenCalledWith('/invitations/accept', {
      token: 'invitation-token-abc',
    });
  });

  it('should return response data on accept', async () => {
    api.post.mockResolvedValue({
      data: { user: { id: 1 }, organization: { slug: 'new-org' } },
    });

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync('token-123');
    });

    expect(data).toEqual({ user: { id: 1 }, organization: { slug: 'new-org' } });
  });

  it('should invalidate users query on success', async () => {
    api.post.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('token-123');
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
  });

  it('should handle expired token error', async () => {
    api.post.mockRejectedValue(new Error('Token expired'));

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('expired-token');
      }),
    ).rejects.toThrow('Token expired');
  });

  it('should handle invalid token error', async () => {
    api.post.mockRejectedValue(new Error('Invalid token'));

    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('bad-token');
      }),
    ).rejects.toThrow('Invalid token');
  });

  it('should work without organization (public route)', () => {
    useOrganization.mockReturnValue(null);
    // Should not throw - this is a public route
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeTypeOf('function');
  });
});
