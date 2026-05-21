import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../hooks/useOwner', () => ({
  useOwner: vi.fn(),
}));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { useOwner } from '../hooks/useOwner';
import { useUserRole } from '../hooks/useUserRole';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useUserRole', () => {
  it('should return empty roles when no organization data', () => {
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({ data: null, isLoading: false });
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    expect(result.current.roles).toEqual([]);
    expect(result.current.roleIds).toEqual([]);
  });

  it('should return empty roles when no user in storage', async () => {
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: {
        slug: 'my-org',
        users: [{ id: 1, name: 'Alice', pivot: { role_id: 10 } }],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [{ id: 10, name: 'Admin', slug: 'admin' }],
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current.roles).toEqual([]);
    expect(result.current.roleIds).toEqual([]);
  });

  it('should resolve a single role for the current user', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Alice' }));
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: {
        slug: 'my-org',
        users: [{ id: 1, name: 'Alice', pivot: { role_id: 10 } }],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [
        { id: 10, name: 'Admin', slug: 'admin' },
        { id: 20, name: 'Assistant', slug: 'assistant' },
      ],
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.roles).toHaveLength(1));
    expect(result.current.roles[0]).toEqual({
      id: 10,
      name: 'Admin',
      slug: 'admin',
    });
    expect(result.current.roleIds).toEqual([10]);
  });

  it('should resolve multiple roles for the current user', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Alice' }));
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: {
        slug: 'my-org',
        users: [
          { id: 1, name: 'Alice', pivot: { role_id: 10 } },
          { id: 1, name: 'Alice', pivot: { role_id: 20 } },
          { id: 2, name: 'Bob', pivot: { role_id: 20 } },
        ],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [
        { id: 10, name: 'Admin', slug: 'admin' },
        { id: 20, name: 'Assistant', slug: 'assistant' },
      ],
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.roles).toHaveLength(2));
    expect(result.current.roleIds).toEqual([10, 20]);
    expect(result.current.roles[0].slug).toBe('admin');
    expect(result.current.roles[1].slug).toBe('assistant');
  });

  it('should not include roles from other users', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Alice' }));
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: {
        slug: 'my-org',
        users: [
          { id: 1, name: 'Alice', pivot: { role_id: 20 } },
          { id: 2, name: 'Bob', pivot: { role_id: 10 } },
        ],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [
        { id: 10, name: 'Admin', slug: 'admin' },
        { id: 20, name: 'Assistant', slug: 'assistant' },
      ],
    });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.roles).toHaveLength(1));
    expect(result.current.roles[0].slug).toBe('assistant');
    expect(result.current.roleIds).toEqual([20]);
  });

  it('should fetch roles from the correct API endpoint', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('acme-corp');
    useOwner.mockReturnValue({ data: null, isLoading: false });
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).toBe('/acme-corp/roles');
  });

  it('should not fetch roles when organization slug is null', () => {
    useOrganization.mockReturnValue(null);
    useOwner.mockReturnValue({ data: null, isLoading: false });

    renderHook(() => useUserRole(), { wrapper: createWrapper() });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('should report isLoading when org is loading', () => {
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({ data: null, isLoading: true });
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  describe('hasRole', () => {
    it('should return true when user has the role by name', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({
        data: {
          users: [{ id: 1, pivot: { role_id: 10 } }],
        },
        isLoading: false,
      });
      api.get.mockResolvedValue({
        data: [{ id: 10, name: 'Admin', slug: 'admin' }],
      });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.roles).toHaveLength(1));
      expect(result.current.hasRole('Admin')).toBe(true);
    });

    it('should return true when user has the role by slug', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({
        data: {
          users: [{ id: 1, pivot: { role_id: 10 } }],
        },
        isLoading: false,
      });
      api.get.mockResolvedValue({
        data: [{ id: 10, name: 'Admin', slug: 'admin' }],
      });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.roles).toHaveLength(1));
      expect(result.current.hasRole('admin')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({
        data: {
          users: [{ id: 1, pivot: { role_id: 10 } }],
        },
        isLoading: false,
      });
      api.get.mockResolvedValue({
        data: [{ id: 10, name: 'Admin', slug: 'admin' }],
      });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.roles).toHaveLength(1));
      expect(result.current.hasRole('ADMIN')).toBe(true);
      expect(result.current.hasRole('aDmIn')).toBe(true);
    });

    it('should return false when user does not have the role', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({
        data: {
          users: [{ id: 1, pivot: { role_id: 20 } }],
        },
        isLoading: false,
      });
      api.get.mockResolvedValue({
        data: [
          { id: 10, name: 'Admin', slug: 'admin' },
          { id: 20, name: 'Assistant', slug: 'assistant' },
        ],
      });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.roles).toHaveLength(1));
      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should return false when roles are not loaded yet', () => {
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({ data: null, isLoading: true });
      api.get.mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should match any role when user has multiple roles', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      useOrganization.mockReturnValue('my-org');
      useOwner.mockReturnValue({
        data: {
          users: [
            { id: 1, pivot: { role_id: 10 } },
            { id: 1, pivot: { role_id: 20 } },
          ],
        },
        isLoading: false,
      });
      api.get.mockResolvedValue({
        data: [
          { id: 10, name: 'Admin', slug: 'admin' },
          { id: 20, name: 'Assistant', slug: 'assistant' },
        ],
      });

      const { result } = renderHook(() => useUserRole(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.roles).toHaveLength(2));
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('assistant')).toBe(true);
      expect(result.current.hasRole('superadmin')).toBe(false);
    });
  });
});
