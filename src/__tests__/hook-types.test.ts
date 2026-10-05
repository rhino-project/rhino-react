import { describe, it, expect } from 'vitest';
import type { InfiniteData, UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  useModelIndex,
  useModelShow,
  useModelTrashed,
  useModelComputedAttributes,
  useModelAudit,
  useModelInfinite,
  useModelStore,
  useModelUpdate,
} from '../hooks/useModel';
import { modelKeys, fetchModelIndex, fetchModelShow } from '../lib/model';
import type { AuditLog, PaginationMeta, QueryResponse } from '../types';

// Compile-time checks, enforced by `tsc --noEmit` (this file is in tsconfig's
// `include`). The functions below are never called: hooks cannot run outside a
// component, and only their types matter here.

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function assertType<T extends true>(): T | void {}

interface Post {
  id: number;
  title: string;
}

export function queryHookTypes() {
  // Without queryOptions the data type is what it was in 4.6.0.
  const index = useModelIndex<Post>('posts');
  assertType<Equal<typeof index, UseQueryResult<QueryResponse<Post>, Error>>>();
  const show = useModelShow<Post>('posts', 1);
  assertType<Equal<typeof show.data, Post | undefined>>();
  const trashed = useModelTrashed<Post>('posts');
  assertType<Equal<typeof trashed.data, QueryResponse<Post> | undefined>>();
  const computed = useModelComputedAttributes<{ total: number }>('posts');
  assertType<Equal<typeof computed.data, { total: number } | undefined>>();
  const audit = useModelAudit('posts', 1);
  assertType<Equal<typeof audit.data, QueryResponse<AuditLog> | undefined>>();

  // `select` flows into the return type, and its argument is typed.
  const titles = useModelIndex<Post, string[]>('posts', {}, {
    select: (response) => response.data.map((post) => post.title),
  });
  assertType<Equal<typeof titles.data, string[] | undefined>>();
  const title = useModelShow<Post, string>('posts', 1, {}, { select: (post) => post.title });
  assertType<Equal<typeof title.data, string | undefined>>();
  const count = useModelTrashed<Post, number>('posts', {}, { select: (response) => response.data.length });
  assertType<Equal<typeof count.data, number | undefined>>();
  const total = useModelComputedAttributes<{ total: number }, number>('posts', {}, { select: (stats) => stats.total });
  assertType<Equal<typeof total.data, number | undefined>>();
  const actions = useModelAudit<string[]>('posts', 1, {}, { select: (logs) => logs.data.map((log) => log.action) });
  assertType<Equal<typeof actions.data, string[] | undefined>>();

  // Common options are accepted.
  useModelIndex<Post>('posts', {}, {
    enabled: true,
    refetchInterval: 5000,
    staleTime: 1000,
    gcTime: 1000,
    retry: 2,
    placeholderData: (previous) => previous,
  });
  useModelIndex<Post>('posts', {}, { enabled: (query) => query.state.dataUpdateCount < 3 });

  // The hook owns the key and the fetcher.
  // @ts-expect-error queryKey is not accepted
  useModelIndex<Post>('posts', {}, { queryKey: ['mine'] });
  // @ts-expect-error queryFn is not accepted
  useModelShow<Post>('posts', 1, {}, { queryFn: async () => ({ id: 1, title: '' }) });
}

export function infiniteHookTypes() {
  const list = useModelInfinite<Post>('posts', { perPage: 20 });
  assertType<Equal<typeof list.data, InfiniteData<QueryResponse<Post>, number> | undefined>>();
  assertType<Equal<typeof list.pagination, PaginationMeta | null>>();
  const posts: Post[] = list.data?.pages.flatMap((page) => page.data) ?? [];

  const flat = useModelInfinite<Post, Post[]>('posts', {}, {
    select: (data) => data.pages.flatMap((page) => page.data),
  });
  assertType<Equal<typeof flat.data, Post[] | undefined>>();

  // @ts-expect-error the page param is derived from the pagination headers
  useModelInfinite<Post>('posts', {}, { getNextPageParam: () => 2 });
  return posts;
}

export function mutationHookTypes() {
  // Variables accept FormData next to the JSON payload.
  const store = useModelStore<Post>('posts');
  assertType<Equal<typeof store, UseMutationResult<Post, Error, Partial<Post> | FormData, unknown>>>();
  store.mutate({ title: 'A' });
  store.mutate(new FormData());

  const update = useModelUpdate<Post>('posts');
  update.mutate({ id: 1, data: { title: 'A' } });
  update.mutate({ id: 1, data: new FormData() });

  // mutationOptions: typed callbacks and context.
  useModelStore<Post, { previous: Post[] }>('posts', {
    onMutate: () => ({ previous: [] }),
    onSuccess: (post, variables) => {
      assertType<Equal<typeof post, Post>>();
      assertType<Equal<typeof variables, Partial<Post> | FormData>>();
    },
    onError: (_error, _variables, context) => {
      assertType<Equal<typeof context, { previous: Post[] } | undefined>>();
    },
  });

  // @ts-expect-error mutationFn is not accepted
  useModelStore<Post>('posts', { mutationFn: async () => ({ id: 1, title: '' }) });
}

export async function outsideReactTypes() {
  const page = await fetchModelIndex<Post>('posts', { perPage: 10 });
  assertType<Equal<typeof page, QueryResponse<Post>>>();
  const post = await fetchModelShow<Post>('posts', 1);
  assertType<Equal<typeof post, Post>>();
  const key: readonly unknown[] = modelKeys.index('posts', {});
  return key;
}

describe('hook types', () => {
  it('compile (asserted by tsc)', () => {
    expect(typeof queryHookTypes).toBe('function');
  });
});
