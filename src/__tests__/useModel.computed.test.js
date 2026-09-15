import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the axios layer + collaborators, mirroring useModel.scope.test.js.
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
  useModelComputedAttributes,
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

/** The URL of the first GET issued. */
async function firstGetUrl() {
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  return api.get.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  tenancyState.mode = 'path';
  getTenancy.mockImplementation(() => tenancyState.mode);
  useOrganization.mockReturnValue('my-org');
  extractPaginationFromHeaders.mockReturnValue(null);
});

describe('?computed_attributes= on the read hooks', () => {
  it('useModelIndex appends computed_attributes for a single name', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users', { computedAttributes: ['full_name'] }), {
      wrapper: createWrapper(),
    });

    expect(await firstGetUrl()).toContain('computed_attributes=full_name');
  });

  it('useModelIndex joins multiple names with a comma', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () => useModelIndex('users', { computedAttributes: ['full_name', 'avatar_url'] }),
      { wrapper: createWrapper() },
    );

    const url = await firstGetUrl();
    expect(decodeURIComponent(url)).toContain('computed_attributes=full_name,avatar_url');
  });

  it('useModelIndex omits the param when not requested', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });

    expect(await firstGetUrl()).not.toContain('computed_attributes');
  });

  it('useModelIndex omits the param for an empty array', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users', { computedAttributes: [] }), {
      wrapper: createWrapper(),
    });

    expect(await firstGetUrl()).not.toContain('computed_attributes');
  });

  it('useModelIndex combines the param with filters and scope', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () =>
        useModelIndex('users', {
          computedAttributes: ['full_name'],
          filters: { status: 'active' },
          scope: 'owned',
        }),
      { wrapper: createWrapper() },
    );

    const url = decodeURIComponent(await firstGetUrl());
    expect(url).toContain('filter[status]=active');
    expect(url).toContain('scope=owned');
    expect(url).toContain('computed_attributes=full_name');
  });

  it('useModelShow appends computed_attributes', async () => {
    api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
    renderHook(() => useModelShow('users', 5, { computedAttributes: ['full_name'] }), {
      wrapper: createWrapper(),
    });

    const url = await firstGetUrl();
    expect(url).toContain('/my-org/users/5');
    expect(url).toContain('computed_attributes=full_name');
  });

  it('useModelShow omits the param when not requested', async () => {
    api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
    renderHook(() => useModelShow('users', 5), { wrapper: createWrapper() });

    expect(await firstGetUrl()).not.toContain('computed_attributes');
  });

  it('useModelTrashed appends computed_attributes', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelTrashed('users', { computedAttributes: ['full_name'] }), {
      wrapper: createWrapper(),
    });

    const url = await firstGetUrl();
    expect(url).toContain('/my-org/users/trashed');
    expect(url).toContain('computed_attributes=full_name');
  });
});

describe('useModelComputedAttributes', () => {
  it('hits the /computed endpoint under the org prefix', async () => {
    api.get.mockResolvedValue({ data: { data: { active_users_count: 3 } }, headers: {} });
    renderHook(() => useModelComputedAttributes('users'), { wrapper: createWrapper() });

    expect(await firstGetUrl()).toBe('/my-org/users/computed');
  });

  it('appends the selected attributes', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    renderHook(
      () =>
        useModelComputedAttributes('users', {
          attributes: ['active_users_count', 'blocked_users_count'],
        }),
      { wrapper: createWrapper() },
    );

    const url = decodeURIComponent(await firstGetUrl());
    expect(url).toContain('attributes=active_users_count,blocked_users_count');
  });

  it('omits the param when no attributes are given', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    renderHook(() => useModelComputedAttributes('users', {}), { wrapper: createWrapper() });

    expect(await firstGetUrl()).not.toContain('attributes=');
  });

  it('omits the param for an empty attribute array', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    renderHook(() => useModelComputedAttributes('users', { attributes: [] }), {
      wrapper: createWrapper(),
    });

    expect(await firstGetUrl()).not.toContain('attributes=');
  });

  it('forwards filters, search and scope so aggregates match the listing', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    renderHook(
      () =>
        useModelComputedAttributes('users', {
          attributes: ['active_users_count'],
          filters: { team_id: 3 },
          search: 'ada',
          scope: 'owned',
        }),
      { wrapper: createWrapper() },
    );

    const url = decodeURIComponent(await firstGetUrl());
    expect(url).toContain('attributes=active_users_count');
    expect(url).toContain('filter[team_id]=3');
    expect(url).toContain('search=ada');
    expect(url).toContain('scope=owned');
  });

  it('unwraps the { data: … } envelope', async () => {
    api.get.mockResolvedValue({
      data: { data: { active_users_count: 12, blocked_users_count: 2 } },
      headers: {},
    });

    const { result } = renderHook(
      () => useModelComputedAttributes('users', { attributes: ['active_users_count'] }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ active_users_count: 12, blocked_users_count: 2 });
  });

  it('passes through a bare (unwrapped) response body', async () => {
    api.get.mockResolvedValue({ data: { active_users_count: 4 }, headers: {} });

    const { result } = renderHook(() => useModelComputedAttributes('users'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ active_users_count: 4 });
  });

  it('surfaces a 403 from a denied attribute as an error', async () => {
    api.get.mockRejectedValue(new Error("Computed attribute 'x' is not allowed"));

    const { result } = renderHook(
      () => useModelComputedAttributes('users', { attributes: ['x'] }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toContain('is not allowed');
  });

  it('does not fire without an organization in path mode', async () => {
    useOrganization.mockReturnValue(null);
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });

    renderHook(() => useModelComputedAttributes('users'), { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 20));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fires without an organization in subdomain mode, with no org segment', async () => {
    tenancyState.mode = 'subdomain';
    useOrganization.mockReturnValue(null);
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });

    renderHook(() => useModelComputedAttributes('users', { attributes: ['active_users_count'] }), {
      wrapper: createWrapper(),
    });

    const url = await firstGetUrl();
    expect(url.startsWith('/users/computed')).toBe(true);
  });

  it('keys the react-query cache by model, org and options', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    const wrapper = createWrapper();

    renderHook(() => useModelComputedAttributes('users', { attributes: ['a'] }), { wrapper });
    renderHook(() => useModelComputedAttributes('users', { attributes: ['b'] }), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    const urls = api.get.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('attributes=a'))).toBe(true);
    expect(urls.some((u) => u.includes('attributes=b'))).toBe(true);
  });
});

describe('computed attributes — legacy comma list is byte-identical', () => {
  // The array form must keep producing exactly the URLs 4.4.0 produced
  // (URLSearchParams percent-encodes the comma as %2C).
  it('useModelIndex: exact URL for a comma list', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () => useModelIndex('users', { computedAttributes: ['full_name', 'avatar_url'] }),
      { wrapper: createWrapper() },
    );

    expect(await firstGetUrl()).toBe('/my-org/users?computed_attributes=full_name%2Cavatar_url');
  });

  it('useModelShow: exact URL for a comma list', async () => {
    api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
    renderHook(
      () => useModelShow('users', 5, { computedAttributes: ['full_name', 'avatar_url'] }),
      { wrapper: createWrapper() },
    );

    expect(await firstGetUrl()).toBe('/my-org/users/5?computed_attributes=full_name%2Cavatar_url');
  });

  it('useModelTrashed: exact URL for a comma list', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(
      () => useModelTrashed('users', { computedAttributes: ['full_name', 'avatar_url'] }),
      { wrapper: createWrapper() },
    );

    expect(await firstGetUrl()).toBe('/my-org/users/trashed?computed_attributes=full_name%2Cavatar_url');
  });

  it('useModelComputedAttributes: exact URL for a comma list', async () => {
    api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
    renderHook(
      () =>
        useModelComputedAttributes('users', {
          attributes: ['active_users_count', 'blocked_users_count'],
        }),
      { wrapper: createWrapper() },
    );

    expect(await firstGetUrl()).toBe(
      '/my-org/users/computed?attributes=active_users_count%2Cblocked_users_count',
    );
  });
});

describe('computed attributes — arguments (object form)', () => {
  /** The first GET URL with percent-encoding undone, for readable bracket assertions. */
  async function firstGetUrlDecoded() {
    return decodeURIComponent(await firstGetUrl());
  }

  describe('useModelIndex', () => {
    it('serializes a no-argument attribute with a trailing =', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(() => useModelIndex('users', { computedAttributes: { full_name: null } }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrlDecoded()).toBe('/my-org/users?computed_attributes[full_name]=');
    });

    it('treats an empty string like null (no arguments)', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(() => useModelIndex('users', { computedAttributes: { full_name: '' } }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrlDecoded()).toBe('/my-org/users?computed_attributes[full_name]=');
    });

    it('binds a bare value to the single declared parameter', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () => useModelIndex('users', { computedAttributes: { ticketsSince: '2026-01-01' } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users?computed_attributes[ticketsSince]=2026-01-01',
      );
    });

    it('serializes named parameters one key at a time', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () =>
          useModelIndex('users', {
            computedAttributes: { revenue: { from: 'a', to: 'b' } },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users?computed_attributes[revenue][from]=a&computed_attributes[revenue][to]=b',
      );
    });

    it('mixes no-arg and named-arg entries in key order', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () =>
          useModelIndex('users', {
            computedAttributes: {
              full_name: null,
              ticketsSince: '2026-01-01',
              revenue: { from: 'a', to: 'b' },
            },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users?computed_attributes[full_name]=&computed_attributes[ticketsSince]=2026-01-01&computed_attributes[revenue][from]=a&computed_attributes[revenue][to]=b',
      );
    });

    it('serializes booleans and numbers as strings', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () =>
          useModelIndex('users', {
            computedAttributes: { flagged: false, topN: 5, window: { strict: true, days: 30 } },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users?computed_attributes[flagged]=false&computed_attributes[topN]=5&computed_attributes[window][strict]=true&computed_attributes[window][days]=30',
      );
    });

    it('omits the param for an empty object', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(() => useModelIndex('users', { computedAttributes: {} }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrl()).toBe('/my-org/users');
    });

    it('percent-encodes the brackets on the wire', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () => useModelIndex('users', { computedAttributes: { ticketsSince: '2026-01-01' } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrl()).toBe(
        '/my-org/users?computed_attributes%5BticketsSince%5D=2026-01-01',
      );
    });

    it('composes the object form with filters, scope arguments and pagination', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () =>
          useModelIndex('users', {
            filters: { status: 'active' },
            scope: { since: '2026-01-01' },
            computedAttributes: { full_name: null, revenue: { from: 'a', to: 'b' } },
            page: 2,
            perPage: 10,
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users?filter[status]=active&scope[since]=2026-01-01&computed_attributes[full_name]=&computed_attributes[revenue][from]=a&computed_attributes[revenue][to]=b&page=2&per_page=10',
      );
    });
  });

  describe('useModelShow', () => {
    it('serializes a no-argument attribute with a trailing =', async () => {
      api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
      renderHook(() => useModelShow('users', 5, { computedAttributes: { full_name: null } }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrlDecoded()).toBe('/my-org/users/5?computed_attributes[full_name]=');
    });

    it('binds a bare value to the single declared parameter', async () => {
      api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
      renderHook(
        () => useModelShow('users', 5, { computedAttributes: { ticketsSince: '2026-01-01' } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/5?computed_attributes[ticketsSince]=2026-01-01',
      );
    });

    it('mixes no-arg and named-arg entries', async () => {
      api.get.mockResolvedValue({ data: { id: 1 }, headers: {} });
      renderHook(
        () =>
          useModelShow('users', 5, {
            computedAttributes: { full_name: null, revenue: { from: 'a', to: 'b' } },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/5?computed_attributes[full_name]=&computed_attributes[revenue][from]=a&computed_attributes[revenue][to]=b',
      );
    });
  });

  describe('useModelTrashed', () => {
    it('serializes a no-argument attribute with a trailing =', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(() => useModelTrashed('users', { computedAttributes: { full_name: null } }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/trashed?computed_attributes[full_name]=',
      );
    });

    it('binds a bare value to the single declared parameter', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () => useModelTrashed('users', { computedAttributes: { ticketsSince: '2026-01-01' } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/trashed?computed_attributes[ticketsSince]=2026-01-01',
      );
    });

    it('mixes no-arg and named-arg entries', async () => {
      api.get.mockResolvedValue({ data: [], headers: {} });
      renderHook(
        () =>
          useModelTrashed('users', {
            computedAttributes: { full_name: null, revenue: { from: 'a', to: 'b' } },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/trashed?computed_attributes[full_name]=&computed_attributes[revenue][from]=a&computed_attributes[revenue][to]=b',
      );
    });
  });

  describe('useModelComputedAttributes', () => {
    it('serializes a no-argument attribute with a trailing =', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      renderHook(
        () => useModelComputedAttributes('users', { attributes: { activeUsersCount: null } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/computed?attributes[activeUsersCount]=',
      );
    });

    it('binds a bare value to the single declared parameter', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      renderHook(
        () => useModelComputedAttributes('users', { attributes: { ticketsSince: '2026-01-01' } }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/computed?attributes[ticketsSince]=2026-01-01',
      );
    });

    it('serializes named parameters and a no-arg entry together (the documented wire form)', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      renderHook(
        () =>
          useModelComputedAttributes('users', {
            attributes: { revenue: { from: 'a', to: 'b' }, activeUsersCount: null },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/computed?attributes[revenue][from]=a&attributes[revenue][to]=b&attributes[activeUsersCount]=',
      );
    });

    it('omits the param for an empty object', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      renderHook(() => useModelComputedAttributes('users', { attributes: {} }), {
        wrapper: createWrapper(),
      });

      expect(await firstGetUrl()).toBe('/my-org/users/computed');
    });

    it('composes the object form with filters, search and scope arguments', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      renderHook(
        () =>
          useModelComputedAttributes('users', {
            attributes: { revenue: { from: 'a', to: 'b' } },
            filters: { team_id: 3 },
            search: 'ada',
            scope: { since: '2026-01-01' },
          }),
        { wrapper: createWrapper() },
      );

      expect(await firstGetUrlDecoded()).toBe(
        '/my-org/users/computed?attributes[revenue][from]=a&attributes[revenue][to]=b&filter[team_id]=3&search=ada&scope[since]=2026-01-01',
      );
    });

    it('distinct argument values issue distinct GET URLs (cache differentiation)', async () => {
      api.get.mockResolvedValue({ data: { data: {} }, headers: {} });
      const wrapper = createWrapper();

      renderHook(
        () => useModelComputedAttributes('users', { attributes: { ticketsSince: '2026-01-01' } }),
        { wrapper },
      );
      renderHook(
        () => useModelComputedAttributes('users', { attributes: { ticketsSince: '2026-02-01' } }),
        { wrapper },
      );

      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      const urls = api.get.mock.calls.map((c) => decodeURIComponent(c[0]));
      expect(urls).toContain('/my-org/users/computed?attributes[ticketsSince]=2026-01-01');
      expect(urls).toContain('/my-org/users/computed?attributes[ticketsSince]=2026-02-01');
    });
  });
});
