import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../hooks/useOwner', () => ({
  useOwner: vi.fn(),
}));

import { useOrganization } from '../hooks/useOrganization';
import { useOwner } from '../hooks/useOwner';
import { useOrganizationExists } from '../hooks/useOrganizationExists';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  useOrganization.mockReturnValue('my-org');
});

describe('useOrganizationExists', () => {
  it('should return exists false when useOwner returns null data', () => {
    useOwner.mockReturnValue({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => useOrganizationExists(), { wrapper: createWrapper() });

    expect(result.current.exists).toBe(false);
    expect(result.current.data).toBe(false);
    expect(result.current.organization).toBeNull();
  });

  it('should return exists true when useOwner returns organization data', () => {
    useOwner.mockReturnValue({
      data: { slug: 'my-org', name: 'My Org' },
      isLoading: false,
      error: null,
    });
    const { result } = renderHook(() => useOrganizationExists(), { wrapper: createWrapper() });

    expect(result.current.exists).toBe(true);
    expect(result.current.data).toBe(true);
    expect(result.current.organization).toEqual({ slug: 'my-org', name: 'My Org' });
  });

  it('should forward isLoading from useOwner', () => {
    useOwner.mockReturnValue({ data: null, isLoading: true, error: null });
    const { result } = renderHook(() => useOrganizationExists(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('should forward error from useOwner', () => {
    const error = new Error('Network error');
    useOwner.mockReturnValue({ data: null, isLoading: false, error });
    const { result } = renderHook(() => useOrganizationExists(), { wrapper: createWrapper() });

    expect(result.current.error).toBe(error);
    expect(result.current.error.message).toBe('Network error');
  });

  it('should return data as boolean true not the object', () => {
    useOwner.mockReturnValue({
      data: { slug: 'org', name: 'Org', users: [] },
      isLoading: false,
      error: null,
    });
    const { result } = renderHook(() => useOrganizationExists(), { wrapper: createWrapper() });

    expect(result.current.data).toBe(true);
    expect(typeof result.current.data).toBe('boolean');
  });
});
