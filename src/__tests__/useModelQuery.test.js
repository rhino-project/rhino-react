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

vi.mock('../lib/pagination', () => ({
  extractPaginationFromHeaders: vi.fn(),
}));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { extractPaginationFromHeaders } from '../lib/pagination';
import { useModelQuery } from '../hooks/useModelQuery';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useModelQuery (deprecated wrapper)', () => {
  it('should behave identically to useModelIndex', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [{ id: 1 }], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    const { result } = renderHook(() => useModelQuery('posts'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.data).toEqual([{ id: 1 }]);
  });

  it('should pass options through to useModelIndex', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () => useModelQuery('posts', { filters: { status: 'draft' }, page: 3 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('filter%5Bstatus%5D=draft');
    expect(url).toContain('page=3');
  });

  it('should default to empty options', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelQuery('users'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users');
  });

  it('should return disabled state when org is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelQuery('users'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });
});
