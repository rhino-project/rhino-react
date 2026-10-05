import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { configureApi } from '../lib/axios';
import {
  useModelInfinite,
  useModelIndex,
  useModelStore,
  useModelUpdate,
  useModelDelete,
  useModelRestore,
  useModelForceDelete,
  useNestedOperations,
} from '../hooks/useModel';
import { useAcceptInvitation } from '../hooks/useInvitations';
import { stubAdapter, createClient, wrapperFor } from './helpers/realApi';

let requests;
let queryClient;
let lastPage;

const pageOf = (config) => Number(new URL(config.url, 'http://x').searchParams.get('page'));

/** A paginated `posts` endpoint with `lastPage` pages of two records each. */
function paginated(config) {
  if (config.method !== 'get') return { data: { id: 99 } };
  const page = pageOf(config);
  return {
    data: { data: [{ id: page * 10 + 1 }, { id: page * 10 + 2 }] },
    headers: {
      'x-current-page': String(page),
      'x-last-page': String(lastPage),
      'x-per-page': '2',
      'x-total': String(lastPage * 2),
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('organization_slug', 'acme');
  configureApi({ baseURL: '/api', routeGroup: null, tenancy: 'path', routeGroupInDataPath: false });
  lastPage = 3;
  requests = stubAdapter(paginated);
  queryClient = createClient();
});

afterEach(() => configureApi({ tenancy: 'path' }));

const render = (hook) => renderHook(hook, { wrapper: wrapperFor(queryClient) });

describe('useModelInfinite', () => {
  it('loads page 1 and derives the next page from the headers', async () => {
    const { result } = render(() => useModelInfinite('posts', { perPage: 2, sort: '-id' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requests.map((config) => config.url)).toEqual(['/acme/posts?sort=-id&page=1&per_page=2']);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.data.pageParams).toEqual([1]);
    expect(result.current.pagination).toEqual({ currentPage: 1, lastPage: 3, perPage: 2, total: 6 });
  });

  it('accumulates pages and stops at the last one', async () => {
    const { result } = render(() => useModelInfinite('posts', { perPage: 2 }));
    await waitFor(() => expect(result.current.pagination?.currentPage).toBe(1));

    // TanStack Query notifies observers on a timer, hence the waitFor after each page.
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.pagination.currentPage).toBe(2));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.pagination.currentPage).toBe(3));
    expect(result.current.hasNextPage).toBe(false);

    // Nothing left: asking again requests nothing.
    await act(async () => { await result.current.fetchNextPage(); });
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(requests.map(pageOf)).toEqual([1, 2, 3]);
    expect(result.current.data.pageParams).toEqual([1, 2, 3]);
    expect(result.current.data.pages.flatMap((page) => page.data).map((post) => post.id)).toEqual([
      11, 12, 21, 22, 31, 32,
    ]);
  });

  it('a single page has no next page', async () => {
    lastPage = 1;
    const { result } = render(() => useModelInfinite('posts'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('a response without pagination headers has no next page and a null pagination', async () => {
    requests = stubAdapter(() => ({ data: [{ id: 1 }] }));
    const { result } = render(() => useModelInfinite('posts'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.pagination).toBeNull();
    expect(result.current.data.pages[0].data).toEqual([{ id: 1 }]);
  });

  it('ignores options.page and respects perPage / per_page', async () => {
    const first = render(() => useModelInfinite('posts', { page: 7, perPage: 2 }));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    const second = render(() => useModelInfinite('posts', { per_page: 4 }));
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(requests.map((config) => config.url)).toEqual([
      '/acme/posts?page=1&per_page=2',
      '/acme/posts?page=1&per_page=4',
    ]);
  });

  it('has its own key, separate from useModelIndex', async () => {
    render(() => useModelInfinite('posts', { perPage: 2 }));
    render(() => useModelIndex('posts', { perPage: 2 }));
    await waitFor(() => expect(requests).toHaveLength(2));

    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
      ['modelInfinite', 'posts', 'acme', { perPage: 2 }],
      ['modelIndex', 'posts', 'acme', { perPage: 2 }],
    ]);
  });

  it('accepts queryOptions: enabled is AND-ed with the organization guard', async () => {
    const disabled = render(() => useModelInfinite('posts', {}, { enabled: false }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(requests).toHaveLength(0);
    disabled.unmount();

    localStorage.removeItem('organization_slug');
    render(() => useModelInfinite('posts', {}, { enabled: true }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(requests).toHaveLength(0);
  });

  it('select reshapes data while pagination still reflects the last loaded page', async () => {
    const { result } = render(() =>
      useModelInfinite('posts', {}, { select: (data) => data.pages.flatMap((page) => page.data) }),
    );
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.data.map((post) => post.id)).toEqual([11, 12, 21, 22]));
    expect(result.current.pagination.currentPage).toBe(2);
  });

  it('follows tenancy and the route-group data path', async () => {
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    localStorage.clear();
    const { result } = render(() => useModelInfinite('posts'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].url).toBe('/driver/posts?page=1');
  });
});

describe('useModelInfinite — re-rendering', () => {
  it('a component that reads only pagination re-renders when a page arrives', async () => {
    let renders = 0;
    const { result } = render(() => {
      renders += 1;
      const query = useModelInfinite('posts');
      return { pagination: query.pagination, fetchNextPage: query.fetchNextPage };
    });
    await waitFor(() => expect(result.current.pagination?.currentPage).toBe(1));
    const before = renders;

    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.pagination.currentPage).toBe(2));
    expect(renders).toBeGreaterThan(before);
  });

  it('exposes pagination through `in` and keeps the standard result intact', async () => {
    const { result } = render(() => useModelInfinite('posts'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect('pagination' in result.current).toBe(true);
    expect('fetchNextPage' in result.current).toBe(true);
    expect(result.current.fetchNextPage).toBeTypeOf('function');
    expect(result.current.status).toBe('success');
  });
});

describe('mutations invalidate useModelInfinite together with useModelIndex', () => {
  const isInvalidated = (root) =>
    queryClient.getQueryCache().getAll().find((query) => query.queryKey[0] === root).state.isInvalidated;

  async function seedLists() {
    const infinite = render(() => useModelInfinite('posts'));
    const index = render(() => useModelIndex('posts'));
    await waitFor(() => expect(infinite.result.current.isSuccess && index.result.current.isSuccess).toBe(true));
    // Unmount so invalidation marks the entries instead of refetching them.
    infinite.unmount();
    index.unmount();
    expect(isInvalidated('modelInfinite')).toBe(false);
  }

  const mutations = [
    ['useModelStore', () => useModelStore('posts'), { title: 'A' }],
    ['useModelUpdate', () => useModelUpdate('posts'), { id: 1, data: { title: 'A' } }],
    ['useModelDelete', () => useModelDelete('posts'), 1],
    ['useModelRestore', () => useModelRestore('posts'), 1],
    ['useNestedOperations', () => useNestedOperations(), { operations: [{ action: 'create', model: 'posts', data: {} }] }],
  ];

  it.each(mutations)('%s', async (_name, hook, variables) => {
    await seedLists();
    const { result } = render(hook);
    await act(async () => { await result.current.mutateAsync(variables); });

    expect(isInvalidated('modelInfinite')).toBe(true);
    expect(isInvalidated('modelIndex')).toBe(true);
  });

  it('a store mutation refetches a mounted infinite list', async () => {
    const list = render(() => useModelInfinite('posts'));
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const before = requests.length;

    const { result } = render(() => useModelStore('posts'));
    await act(async () => { await result.current.mutateAsync({ title: 'A' }); });

    await waitFor(() => expect(requests.filter((config) => config.method === 'get').length).toBe(before + 1));
  });

  it('useModelForceDelete invalidates neither list, as with useModelIndex', async () => {
    await seedLists();
    const { result } = render(() => useModelForceDelete('posts'));
    await act(async () => { await result.current.mutateAsync(1); });

    expect(isInvalidated('modelInfinite')).toBe(false);
    expect(isInvalidated('modelIndex')).toBe(false);
  });

  it('useAcceptInvitation invalidates both users lists', async () => {
    const infinite = render(() => useModelInfinite('users'));
    await waitFor(() => expect(infinite.result.current.isSuccess).toBe(true));
    infinite.unmount();

    const { result } = render(() => useAcceptInvitation());
    await act(async () => { await result.current.mutateAsync('tok'); });

    expect(isInvalidated('modelInfinite')).toBe(true);
  });
});
