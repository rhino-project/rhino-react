import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the axios layer + collaborators, mirroring useModel.tenancy.test.js.
const tenancyState = { mode: 'path' };

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getTenancy: vi.fn(() => tenancyState.mode),
}));

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../lib/pagination', () => ({
  extractPaginationFromHeaders: vi.fn(),
}));

import api, { getTenancy } from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { extractPaginationFromHeaders } from '../lib/pagination';
import {
  useModelIndex,
  useModelShow,
  useModelTrashed,
} from '../hooks/useModel';

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
  tenancyState.mode = 'path';
  getTenancy.mockImplementation(() => tenancyState.mode);
  useOrganization.mockReturnValue('my-org');
  extractPaginationFromHeaders.mockReturnValue(null);
});

describe('useModel — ?scope= support', () => {
  // 1. index issues a GET whose URL contains scope=availableForDrivers
  it('useModelIndex appends scope=<name>', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('routes', { scope: 'availableForDrivers' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).toContain('scope=availableForDrivers');
  });

  // 2. scope composes with filters / sort / pagination
  it('useModelIndex composes scope with filters, sort, and pagination', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () =>
        useModelIndex('routes', {
          scope: 'active',
          filters: { status: 'x' },
          sort: '-created_at',
          page: 2,
          perPage: 10,
        }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    const u = new URL('http://x' + url);
    const p = u.searchParams;
    expect(p.get('scope')).toBe('active');
    expect(p.get('filter[status]')).toBe('x');
    expect(p.get('sort')).toBe('-created_at');
    expect(p.get('page')).toBe('2');
    expect(p.get('per_page')).toBe('10');
    expect((url.match(/\?/g) || []).length).toBe(1);
  });

  // 3. no scope → URL has no scope= param
  it('useModelIndex omits scope when none is passed', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('routes', { sort: '-created_at' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).not.toContain('scope=');
  });

  // 4. trashed listing carries scope on the /trashed path
  it('useModelTrashed appends scope on the /trashed path', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelTrashed('routes', { scope: 'active' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/routes/trashed?');
    expect(url).toContain('scope=active');
  });

  // 4b. trashed composes scope with filters / sort / pagination
  it('useModelTrashed composes scope with filters, sort, and pagination', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () =>
        useModelTrashed('routes', {
          scope: 'active',
          filters: { status: 'x' },
          sort: '-created_at',
          page: 2,
          perPage: 10,
        }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/routes/trashed?');
    const u = new URL('http://x' + url);
    const p = u.searchParams;
    expect(p.get('scope')).toBe('active');
    expect(p.get('filter[status]')).toBe('x');
    expect(p.get('sort')).toBe('-created_at');
    expect(p.get('page')).toBe('2');
    expect(p.get('per_page')).toBe('10');
  });

  // 5. cache differentiation: different scopes → distinct requests
  it('distinct scope values issue distinct GET URLs (cache differentiation)', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    const wrapper = createWrapper();
    renderHook(() => useModelIndex('routes', { scope: 'active' }), { wrapper });
    renderHook(() => useModelIndex('routes', { scope: 'archived' }), { wrapper });
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2));
    const urls = api.get.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('scope=active'))).toBe(true);
    expect(urls.some((u) => u.includes('scope=archived'))).toBe(true);
  });

  // 6. useModelShow does NOT append scope (intentional omission)
  it('useModelShow does NOT append scope even if passed', async () => {
    api.get.mockResolvedValue({ data: { id: 1 } });
    renderHook(() => useModelShow('routes', 1, { scope: 'active' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).not.toContain('scope=');
  });
});
