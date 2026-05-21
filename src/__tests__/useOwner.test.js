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
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOwner', () => {
  it('should return disabled state when no slug and no organization', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useOwner(), { wrapper: createWrapper() });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fall back to useOrganization slug when no slug param', async () => {
    useOrganization.mockReturnValue('url-org');
    api.get.mockResolvedValue({ data: { slug: 'url-org', name: 'URL Org' } });

    renderHook(() => useOwner(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/url-org/organizations');
    expect(url).toContain('filter[slug]=url-org');
    expect(url).toContain('include=users');
  });

  it('should use explicit slug parameter over useOrganization', async () => {
    useOrganization.mockReturnValue('url-org');
    api.get.mockResolvedValue({ data: { slug: 'explicit-org', name: 'Explicit Org' } });

    renderHook(() => useOwner('explicit-org'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/explicit-org/organizations');
    expect(url).not.toContain('/url-org/');
  });

  it('should find matching organization from array response', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({
      data: [
        { slug: 'other-org', name: 'Other Org' },
        { slug: 'my-org', name: 'My Org' },
      ],
    });

    const { result } = renderHook(() => useOwner('my-org'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.slug).toBe('my-org');
    expect(result.current.data.name).toBe('My Org');
  });

  it('should return first element when no exact match in array', async () => {
    useOrganization.mockReturnValue('nonexistent');
    api.get.mockResolvedValue({
      data: [
        { slug: 'first-org', name: 'First' },
        { slug: 'second-org', name: 'Second' },
      ],
    });

    const { result } = renderHook(() => useOwner('nonexistent'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.slug).toBe('first-org');
  });

  it('should return null for empty array response', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useOwner('my-org'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // waitFor query to settle then check
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it('should return object directly when response is not an array', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: { slug: 'my-org', name: 'My Org' } });

    const { result } = renderHook(() => useOwner('my-org'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toEqual({ slug: 'my-org', name: 'My Org' });
  });

  it('should not call api when no slug is available', () => {
    useOrganization.mockReturnValue(null);
    renderHook(() => useOwner(), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });
});
