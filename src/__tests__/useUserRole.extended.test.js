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

vi.mock('../lib/storage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { useOwner } from '../hooks/useOwner';
import { storage } from '../lib/storage';
import { useUserRole } from '../hooks/useUserRole';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useUserRole – role resolution', () => {
  it('should return empty roles when no user in storage', async () => {
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: { users: [{ id: 1, pivot: { role_id: 1 } }] },
      isLoading: false,
    });
    api.get.mockResolvedValue({ data: [{ id: 1, name: 'Admin', slug: 'admin' }] });
    storage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.roleIds).toEqual([]);
  });

  it('should match user roles from org users', async () => {
    const user = { id: 42, name: 'Alice' };
    storage.getItem.mockReturnValue(JSON.stringify(user));
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: {
        users: [
          { id: 42, pivot: { role_id: 2 } },
          { id: 99, pivot: { role_id: 1 } },
        ],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [
        { id: 1, name: 'Admin', slug: 'admin' },
        { id: 2, name: 'Manager', slug: 'manager' },
      ],
    });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBeGreaterThan(0));
    expect(result.current.roles).toEqual([{ id: 2, name: 'Manager', slug: 'manager' }]);
    expect(result.current.roleIds).toEqual([2]);
  });

  it('should handle user with multiple roles', async () => {
    const user = { id: 1 };
    storage.getItem.mockReturnValue(JSON.stringify(user));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: {
        users: [
          { id: 1, pivot: { role_id: 1 } },
          { id: 1, pivot: { role_id: 3 } },
        ],
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({
      data: [
        { id: 1, name: 'Admin', slug: 'admin' },
        { id: 2, name: 'Editor', slug: 'editor' },
        { id: 3, name: 'Viewer', slug: 'viewer' },
      ],
    });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(2));
    expect(result.current.roles).toEqual([
      { id: 1, name: 'Admin', slug: 'admin' },
      { id: 3, name: 'Viewer', slug: 'viewer' },
    ]);
    expect(result.current.roleIds).toEqual([1, 3]);
  });

  it('should return empty when organization has no users', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({ data: { users: null }, isLoading: false });
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.roleIds).toEqual([]);
  });

  it('should return empty when user has no pivot data', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: { users: [{ id: 1 }] }, // no pivot
      isLoading: false,
    });
    api.get.mockResolvedValue({ data: [{ id: 1, name: 'Admin' }] });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roleIds).toEqual([]);
    expect(result.current.roles).toEqual([]);
  });

  it('should fetch roles from /{org}/roles endpoint', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('acme');
    useOwner.mockReturnValue({ data: null, isLoading: false });
    api.get.mockResolvedValue({ data: [] });

    renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/acme/roles');
  });

  it('should handle non-array response from roles API', async () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({ data: null, isLoading: false });
    api.get.mockResolvedValue({ data: 'not an array' });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
  });
});

describe('useUserRole – hasRole()', () => {
  function setupWithRoles(roles) {
    const user = { id: 1 };
    storage.getItem.mockReturnValue(JSON.stringify(user));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: {
        users: roles.map((r) => ({ id: 1, pivot: { role_id: r.id } })),
      },
      isLoading: false,
    });
    api.get.mockResolvedValue({ data: roles });
  }

  it('should match by exact name', async () => {
    setupWithRoles([{ id: 1, name: 'Admin', slug: 'admin' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('Admin')).toBe(true);
  });

  it('should match by name case-insensitive', async () => {
    setupWithRoles([{ id: 1, name: 'Admin', slug: 'admin' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('admin')).toBe(true);
    expect(result.current.hasRole('ADMIN')).toBe(true);
    expect(result.current.hasRole('AdMiN')).toBe(true);
  });

  it('should match by slug', async () => {
    setupWithRoles([{ id: 1, name: 'Organization Admin', slug: 'org-admin' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('org-admin')).toBe(true);
  });

  it('should match by slug case-insensitive', async () => {
    setupWithRoles([{ id: 1, name: 'Admin', slug: 'org-admin' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('ORG-ADMIN')).toBe(true);
  });

  it('should return false for non-matching role', async () => {
    setupWithRoles([{ id: 1, name: 'Viewer', slug: 'viewer' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('admin')).toBe(false);
    expect(result.current.hasRole('editor')).toBe(false);
  });

  it('should return false when roles is empty', () => {
    storage.getItem.mockReturnValue(null);
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({ data: null, isLoading: false });
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    expect(result.current.hasRole('admin')).toBe(false);
  });

  it('should check against any of multiple user roles', async () => {
    setupWithRoles([
      { id: 1, name: 'Admin', slug: 'admin' },
      { id: 2, name: 'Manager', slug: 'manager' },
    ]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(2));
    expect(result.current.hasRole('admin')).toBe(true);
    expect(result.current.hasRole('manager')).toBe(true);
    expect(result.current.hasRole('viewer')).toBe(false);
  });

  it('should handle role with only name (no slug)', async () => {
    setupWithRoles([{ id: 1, name: 'Super Admin' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('super admin')).toBe(true);
    expect(result.current.hasRole('Super Admin')).toBe(true);
  });

  it('should handle role with only slug (no name)', async () => {
    setupWithRoles([{ id: 1, slug: 'custom-role' }]);
    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.roles.length).toBe(1));
    expect(result.current.hasRole('custom-role')).toBe(true);
  });
});

describe('useUserRole – loading states', () => {
  it('should report loading when org is loading', () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({ data: null, isLoading: true });
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('should not fetch roles when org slug is null', () => {
    storage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    useOrganization.mockReturnValue(null);
    useOwner.mockReturnValue({ data: null, isLoading: false });

    renderHook(() => useUserRole(), { wrapper: createWrapper() });

    expect(api.get).not.toHaveBeenCalled();
  });
});
