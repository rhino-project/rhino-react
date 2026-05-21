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
});

describe('useOrganizationExists – extended', () => {
  it('should return exists=true when organization data is present', () => {
    useOrganization.mockReturnValue('my-org');
    useOwner.mockReturnValue({
      data: { id: 1, slug: 'my-org', name: 'My Org' },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.exists).toBe(true);
    expect(result.current.data).toBe(true);
    expect(result.current.organization).toEqual({ id: 1, slug: 'my-org', name: 'My Org' });
  });

  it('should return exists=false when organization data is null', () => {
    useOrganization.mockReturnValue('unknown-org');
    useOwner.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.exists).toBe(false);
    expect(result.current.data).toBe(false);
    expect(result.current.organization).toBeNull();
  });

  it('should return exists=false when organization data is undefined', () => {
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.exists).toBe(false);
    expect(result.current.data).toBe(false);
  });

  it('should forward isLoading from useOwner', () => {
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should forward error from useOwner', () => {
    useOrganization.mockReturnValue('org');
    const error = new Error('Network Error');
    useOwner.mockReturnValue({
      data: null,
      isLoading: false,
      error,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBe(error);
  });

  it('should return exists=false for empty object (truthy but no data)', () => {
    useOrganization.mockReturnValue('org');
    useOwner.mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    // Empty object is truthy, so exists should be true
    expect(result.current.exists).toBe(true);
  });

  it('should return exists=false for falsy values like 0 or empty string', () => {
    useOrganization.mockReturnValue('org');

    // Test with 0
    useOwner.mockReturnValue({ data: 0, isLoading: false, error: null });
    const { result: r1 } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });
    expect(r1.current.exists).toBe(false);

    // Test with empty string
    useOwner.mockReturnValue({ data: '', isLoading: false, error: null });
    const { result: r2 } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });
    expect(r2.current.exists).toBe(false);
  });

  it('should expose organization data through the organization field', () => {
    useOrganization.mockReturnValue('org');
    const orgData = { id: 5, slug: 'org', name: 'Test', users: [{ id: 1 }] };
    useOwner.mockReturnValue({ data: orgData, isLoading: false, error: null });

    const { result } = renderHook(() => useOrganizationExists(), {
      wrapper: createWrapper(),
    });

    expect(result.current.organization).toEqual(orgData);
    expect(result.current.organization.users).toHaveLength(1);
  });
});
