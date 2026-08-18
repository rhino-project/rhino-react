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
