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

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { useOwner } from '../hooks/useOwner';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOwner – extended', () => {
  it('should use explicit slug over stored organization', async () => {
    useOrganization.mockReturnValue('stored-org');
    api.get.mockResolvedValue({
      data: { id: 1, slug: 'explicit-org', name: 'Explicit Org' },
    });

    const { result } = renderHook(() => useOwner('explicit-org'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/explicit-org/organizations');
    // useOwner uses encodeURIComponent manually, URL is not double-encoded
    expect(url).toContain('filter[slug]=explicit-org');
  });

  it('should include users in the request', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: { id: 1, slug: 'my-org' } });

    renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('include=users');
  });

  it('should handle array response and find matching org', async () => {
    useOrganization.mockReturnValue('target-org');
    api.get.mockResolvedValue({
      data: [
        { id: 1, slug: 'other-org', name: 'Other' },
        { id: 2, slug: 'target-org', name: 'Target' },
      ],
    });

    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.slug).toBe('target-org');
    expect(result.current.data.name).toBe('Target');
  });

  it('should fall back to first element when no exact match in array', async () => {
    useOrganization.mockReturnValue('nonexistent');
    api.get.mockResolvedValue({
      data: [{ id: 1, slug: 'first-org', name: 'First' }],
    });

    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.slug).toBe('first-org');
  });

  it('should return null for empty array response', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('should return object directly for non-array response', async () => {
    useOrganization.mockReturnValue('my-org');
    const org = { id: 1, slug: 'my-org', name: 'My Org', users: [] };
    api.get.mockResolvedValue({ data: org });

    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toEqual(org);
  });

  it('should return disabled state when no slug available', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should have a refetch function when disabled', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });
    expect(result.current.refetch).toBeTypeOf('function');
  });

  it('should handle API error', async () => {
    useOrganization.mockReturnValue('bad-org');
    api.get.mockRejectedValue(new Error('Not Found'));

    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Not Found');
  });

  it('should use correct query key', () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useOwner(), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
    });

    const queries = queryClient.getQueryCache().findAll();
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0].queryKey).toEqual(['owner', 'my-org']);
  });
});
