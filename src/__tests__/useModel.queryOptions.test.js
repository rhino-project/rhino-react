import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import {
  useModelIndex,
  useModelShow,
  useModelTrashed,
  useModelComputedAttributes,
  useModelAudit,
  useModelStore,
  useModelUpdate,
  useModelDelete,
  useModelRestore,
  useModelForceDelete,
  useNestedOperations,
} from '../hooks/useModel';

let queryClient;

function wrapper({ children }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const cachedKeys = () => queryClient.getQueryCache().getAll().map((query) => query.queryKey);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

beforeEach(() => {
  vi.clearAllMocks();
  tenancyState.mode = 'path';
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  useOrganization.mockReturnValue('my-org');
  api.get.mockResolvedValue({ data: [], headers: {} });
});

describe('query hooks — queryOptions', () => {
  const queryHooks = [
    ['useModelIndex', (queryOptions) => useModelIndex('posts', {}, queryOptions)],
    ['useModelShow', (queryOptions) => useModelShow('posts', 1, {}, queryOptions)],
    ['useModelTrashed', (queryOptions) => useModelTrashed('posts', {}, queryOptions)],
    ['useModelComputedAttributes', (queryOptions) => useModelComputedAttributes('posts', {}, queryOptions)],
    ['useModelAudit', (queryOptions) => useModelAudit('posts', 1, {}, queryOptions)],
  ];

  it.each(queryHooks)('%s: enabled: false issues no request', async (_name, hook) => {
    const { result } = renderHook(() => hook({ enabled: false }), { wrapper });
    await flush();
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it.each(queryHooks)('%s: enabled: true with no organization still issues none', async (_name, hook) => {
    useOrganization.mockReturnValue(null);
    renderHook(() => hook({ enabled: true }), { wrapper });
    await flush();
    expect(api.get).not.toHaveBeenCalled();
  });

  it.each(queryHooks)('%s: enabled: true with an organization requests', async (_name, hook) => {
    renderHook(() => hook({ enabled: true }), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  });

  it('enabled: true does not override the missing-id guard', async () => {
    renderHook(() => useModelShow('posts', null, {}, { enabled: true }), { wrapper });
    renderHook(() => useModelAudit('posts', undefined, {}, { enabled: true }), { wrapper });
    await flush();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('enabled as a function is AND-ed with the guard', async () => {
    const enabled = vi.fn(() => true);

    useOrganization.mockReturnValue(null);
    const blocked = renderHook(() => useModelIndex('posts', {}, { enabled }), { wrapper });
    await flush();
    expect(api.get).not.toHaveBeenCalled();
    blocked.unmount();

    useOrganization.mockReturnValue('my-org');
    renderHook(() => useModelIndex('posts', {}, { enabled }), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(enabled).toHaveBeenCalled();
  });

  it('enabled as a function returning false issues no request', async () => {
    renderHook(() => useModelIndex('posts', {}, { enabled: () => false }), { wrapper });
    await flush();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('a dependent query fires once its dependency arrives', async () => {
    const { rerender } = renderHook(
      ({ trip }) => useModelIndex('stops', { filters: { trip_id: trip?.id } }, { enabled: !!trip }),
      { wrapper, initialProps: { trip: undefined } },
    );
    await flush();
    expect(api.get).not.toHaveBeenCalled();

    rerender({ trip: { id: 7 } });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(api.get).toHaveBeenCalledWith('/my-org/stops?filter%5Btrip_id%5D=7');
  });

  it('refetchInterval is passed through', async () => {
    renderHook(() => useModelIndex('posts', {}, { refetchInterval: 30 }), { wrapper });
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(3));

    const [query] = queryClient.getQueryCache().getAll();
    expect(query.observers[0].options.refetchInterval).toBe(30);
  });

  it('staleTime is passed through', async () => {
    const { result } = renderHook(() => useModelIndex('posts', {}, { staleTime: 60_000 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(false);
  });

  it('select transforms the data of useModelIndex', async () => {
    api.get.mockResolvedValue({ data: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }], headers: {} });
    const { result } = renderHook(
      () => useModelIndex('posts', {}, { select: (response) => response.data.map((post) => post.title) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['A', 'B']);
  });

  it('select transforms the data of useModelShow', async () => {
    api.get.mockResolvedValue({ data: { id: 1, title: 'A' } });
    const { result } = renderHook(
      () => useModelShow('posts', 1, {}, { select: (post) => post.title }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('A');
  });

  it('a caller cannot replace queryKey or queryFn', async () => {
    const queryFn = vi.fn();
    renderHook(
      () => useModelIndex('posts', {}, { queryKey: ['mine'], queryFn }),
      { wrapper },
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/my-org/posts'));
    expect(queryFn).not.toHaveBeenCalled();
    expect(cachedKeys()).toEqual([['modelIndex', 'posts', 'my-org', {}]]);
  });

  it('query keys do not include queryOptions', async () => {
    renderHook(() => useModelIndex('posts', { page: 2 }, { staleTime: 5, refetchInterval: false }), { wrapper });
    renderHook(() => useModelShow('posts', 1, {}, { staleTime: 5 }), { wrapper });
    renderHook(() => useModelTrashed('posts', {}, { staleTime: 5 }), { wrapper });
    renderHook(() => useModelComputedAttributes('posts', {}, { staleTime: 5 }), { wrapper });
    renderHook(() => useModelAudit('posts', 1, {}, { staleTime: 5 }), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(5));

    expect(cachedKeys()).toEqual([
      ['modelIndex', 'posts', 'my-org', { page: 2 }],
      ['modelShow', 'posts', 1, 'my-org', {}],
      ['modelTrashed', 'posts', 'my-org', {}],
      ['modelComputedAttributes', 'posts', 'my-org', {}],
      ['modelAudit', 'posts', 1, 'my-org', {}],
    ]);
  });
});

// The keys and URLs a hook called the 4.6.0 way (no trailing options) produces.
describe('query hooks — unchanged without queryOptions', () => {
  it('registers the 4.6.0 keys and requests the 4.6.0 URLs', async () => {
    const options = {
      filters: { status: 'published' },
      includes: ['author'],
      sort: '-created_at',
      fields: ['id', 'title'],
      search: 'rhino',
      scope: 'recent',
      computedAttributes: ['word_count'],
      page: 2,
      perPage: 20,
    };

    renderHook(() => useModelIndex('posts'), { wrapper });
    renderHook(() => useModelIndex('posts', options), { wrapper });
    renderHook(() => useModelShow('posts', 5), { wrapper });
    renderHook(() => useModelShow('posts', 5, options), { wrapper });
    renderHook(() => useModelTrashed('posts', options), { wrapper });
    renderHook(() => useModelComputedAttributes('posts', { attributes: ['total'], search: 'x' }), { wrapper });
    renderHook(() => useModelAudit('posts', 5, { page: 3, per_page: 50 }), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(7));

    expect(cachedKeys()).toEqual([
      ['modelIndex', 'posts', 'my-org', {}],
      ['modelIndex', 'posts', 'my-org', options],
      ['modelShow', 'posts', 5, 'my-org', {}],
      ['modelShow', 'posts', 5, 'my-org', options],
      ['modelTrashed', 'posts', 'my-org', options],
      ['modelComputedAttributes', 'posts', 'my-org', { attributes: ['total'], search: 'x' }],
      ['modelAudit', 'posts', 5, 'my-org', { page: 3, per_page: 50 }],
    ]);

    const list =
      'filter%5Bstatus%5D=published&include=author&sort=-created_at&fields=id%2Ctitle' +
      '&search=rhino&scope=recent&computed_attributes=word_count&page=2&per_page=20';
    expect(api.get.mock.calls.map(([url]) => url)).toEqual([
      '/my-org/posts',
      `/my-org/posts?${list}`,
      '/my-org/posts/5',
      '/my-org/posts/5?include=author&filter%5Bstatus%5D=published&sort=-created_at&fields=id%2Ctitle&computed_attributes=word_count',
      `/my-org/posts/trashed?${list}`,
      '/my-org/posts/computed?attributes=total&search=x',
      '/my-org/posts/5/audit?page=3&per_page=50',
    ]);
  });
});

describe('mutation hooks — mutationOptions', () => {
  const mutationHooks = [
    ['useModelStore', (options) => useModelStore('posts', options), { title: 'A' }, 'post'],
    ['useModelUpdate', (options) => useModelUpdate('posts', options), { id: 1, data: { title: 'A' } }, 'put'],
    ['useModelDelete', (options) => useModelDelete('posts', options), 1, 'delete'],
    ['useModelRestore', (options) => useModelRestore('posts', options), 1, 'post'],
    ['useModelForceDelete', (options) => useModelForceDelete('posts', options), 1, 'delete'],
    [
      'useNestedOperations',
      (options) => useNestedOperations(options),
      { operations: [{ action: 'create', model: 'posts', data: {} }] },
      'post',
    ],
  ];

  it.each(mutationHooks)('%s: caller onSuccess runs after the invalidation', async (_name, hook, variables, method) => {
    api[method].mockResolvedValue({ data: { id: 1 } });
    const order = [];
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => { order.push('invalidate'); return Promise.resolve(); });
    const onSuccess = vi.fn(() => { order.push('caller'); });

    const { result } = renderHook(() => hook({ onSuccess }), { wrapper });
    await act(async () => { await result.current.mutateAsync(variables); });

    expect(invalidate).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0][0]).toEqual({ id: 1 });
    expect(onSuccess.mock.calls[0][1]).toEqual(variables);
    expect(order[0]).toBe('invalidate');
    expect(order[order.length - 1]).toBe('caller');
    expect(order.filter((entry) => entry === 'caller')).toHaveLength(1);
  });

  it('a caller cannot replace mutationFn', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const mutationFn = vi.fn();
    const { result } = renderHook(() => useModelStore('posts', { mutationFn }), { wrapper });
    await act(async () => { await result.current.mutateAsync({ title: 'A' }); });
    expect(mutationFn).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/my-org/posts', { title: 'A' });
  });

  it('onError, onMutate and onSettled are passed through', async () => {
    api.post.mockRejectedValue(new Error('boom'));
    const onMutate = vi.fn(() => 'ctx');
    const onError = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(
      () => useModelStore('posts', { onMutate, onError, onSettled }),
      { wrapper },
    );
    await act(async () => { await result.current.mutateAsync({ title: 'A' }).catch(() => {}); });

    expect(onMutate).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][2]).toBe('ctx');
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('per-call callbacks passed to mutate() keep working, after the hook-level ones', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const order = [];
    const { result } = renderHook(
      () => useModelStore('posts', { onSuccess: () => { order.push('hook'); } }),
      { wrapper },
    );
    act(() => {
      result.current.mutate({ title: 'A' }, { onSuccess: () => { order.push('call'); } });
    });
    await waitFor(() => expect(order).toEqual(['hook', 'call']));
  });

  it('without mutationOptions the invalidation still runs', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useModelStore('posts'), { wrapper });
    await act(async () => { await result.current.mutateAsync({ title: 'A' }); });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'posts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['modelShow', 'posts'] });
  });
});
