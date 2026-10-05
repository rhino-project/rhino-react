import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  InfiniteData,
  QueryClient,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query';
import api from '../lib/axios';
import { apiConfig } from '../lib/api-config';
import { useOrganization } from './useOrganization';
import {
  buildResourceBase,
  orgNotRequired,
  modelKeys,
  fetchModelIndex,
  fetchModelShow,
  fetchModelComputedAttributes,
  fetchModelTrashed,
  fetchModelAudit,
} from '../lib/model';
import type { AxiosResponse } from 'axios';
import type {
  ModelQueryOptions,
  QueryResponse,
  AuditLog,
  NestedOperation,
  ComputedAttributesOptions,
  PaginationMeta,
  ModelQueryHookOptions,
  ModelInfiniteQueryHookOptions,
  ModelMutationHookOptions,
} from '../types';

/**
 * AND the hook's own `enabled` guard (organization present, id present) with
 * the caller's `enabled`. The caller can narrow the guard but never widen it.
 * Both TanStack Query v5 forms are handled: a boolean, and a function of the
 * query.
 */
function combineEnabled(guard: boolean, enabled: unknown): any {
  if (enabled === undefined) return guard;
  if (typeof enabled === 'function') {
    return (query: unknown) => guard && !!enabled(query);
  }
  return guard && !!enabled;
}

/**
 * Wrap the caller's mutation options so the hook's cache invalidation always
 * runs first on success, followed by the caller's own `onSuccess`.
 */
function withInvalidation<TOptions extends { onSuccess?: (...args: any[]) => unknown }>(
  mutationOptions: TOptions | undefined,
  invalidate: (...args: any[]) => void,
) {
  return {
    ...mutationOptions,
    onSuccess: (...args: any[]) => {
      invalidate(...args);
      return mutationOptions?.onSuccess?.(...args);
    },
  };
}

/** Invalidate every cached list of a model: paged (`useModelIndex`) and accumulated (`useModelInfinite`). */
function invalidateLists(queryClient: QueryClient, model: string): void {
  queryClient.invalidateQueries({ queryKey: modelKeys.index(model) });
  queryClient.invalidateQueries({ queryKey: modelKeys.infinite(model) });
}

/** Works on React Native too, where `FormData` is a polyfill. */
function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

/**
 * Per-request config for a multipart body. The instance default is
 * `application/json`, which would make axios serialize the form to JSON and
 * drop its files. `multipart/form-data` keeps the body intact: the browser
 * adapter then drops the header so the browser writes it with the boundary,
 * and React Native's networking layer appends the boundary itself.
 */
const MULTIPART_CONFIG = { headers: { 'Content-Type': 'multipart/form-data' } };

/**
 * A multipart update travels as POST, because PHP does not parse a multipart
 * body on PUT. The real method goes in the `X-HTTP-Method-Override` header,
 * which Laravel honors, and deliberately NOT in a `_method` form field: Rhino
 * treats every form field as an attribute, so `_method` is rejected with 403
 * whenever the policy restricts the writable attributes.
 */
const MULTIPART_PUT_CONFIG = {
  headers: { 'Content-Type': 'multipart/form-data', 'X-HTTP-Method-Override': 'PUT' },
};

function formDataHas(data: FormData, field: string): boolean {
  if (typeof data.has === 'function') return data.has(field);
  // React Native's FormData polyfill has no `has()`; it exposes its parts.
  const parts = (data as unknown as { getParts?: () => Array<{ fieldName?: string }> }).getParts?.() ?? [];
  return parts.some((part) => part.fieldName === field);
}

/**
 * Hook to fetch a list of models (index)
 *
 * @example
 * // Simple usage
 * const { data: response } = useModelIndex('users');
 * const users = response?.data || [];
 *
 * // With typed model
 * const { data: response } = useModelIndex<Post>('posts', {
 *   filters: { status: 'published' },
 *   includes: ['author', 'comments'],
 *   sort: '-created_at',
 *   page: 1,
 *   perPage: 20
 * });
 * const posts = response?.data || []; // Post[]
 *
 * // With TanStack Query options (polling, dependent queries, select, ...)
 * const { data } = useModelIndex<Stop>(
 *   'stops',
 *   { filters: { trip_id: trip?.id } },
 *   { enabled: !!trip, refetchInterval: 15000 },
 * );
 */
export function useModelIndex<T = Record<string, any>, TData = QueryResponse<T>>(
  model: string,
  options: ModelQueryOptions = {},
  queryOptions?: ModelQueryHookOptions<QueryResponse<T>, TData>,
): UseQueryResult<TData, Error> {
  const organization = useOrganization();

  return useQuery<QueryResponse<T>, Error, TData>({
    ...queryOptions,
    queryKey: modelKeys.index(model, options, organization ?? null),
    queryFn: () => fetchModelIndex<T>(model, options, { organization: organization ?? null }),
    enabled: combineEnabled(!!organization || orgNotRequired(), queryOptions?.enabled),
  });
}

/**
 * Hook to fetch a list of models page by page, accumulating the pages
 * ("load more" / infinite scroll).
 *
 * Built on `useInfiniteQuery`. The next page comes from the pagination headers
 * of the last one, and there is none once the last page is reached.
 * `options.page` is ignored (the hook drives the page); `perPage` is respected.
 *
 * Returns the standard infinite-query result plus `pagination`, the pagination
 * of the most recently loaded page (`null` until a page with pagination headers
 * has loaded).
 *
 * @example
 * const { data, pagination, fetchNextPage, hasNextPage, isFetchingNextPage } =
 *   useModelInfinite<Post>('posts', { sort: '-created_at', perPage: 20 });
 * const posts = data?.pages.flatMap((page) => page.data) ?? [];
 */
export function useModelInfinite<T = Record<string, any>, TData = InfiniteData<QueryResponse<T>, number>>(
  model: string,
  options: ModelQueryOptions = {},
  queryOptions?: ModelInfiniteQueryHookOptions<QueryResponse<T>, TData>,
): UseInfiniteQueryResult<TData, Error> & { pagination: PaginationMeta | null } {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const queryKey = modelKeys.infinite(model, options, organization ?? null);

  const result = useInfiniteQuery<QueryResponse<T>, Error, TData, readonly unknown[], number>({
    ...queryOptions,
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchModelIndex<T>(model, { ...options, page: pageParam }, { organization: organization ?? null }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination && pagination.currentPage < pagination.lastPage
        ? pagination.currentPage + 1
        : undefined;
    },
    enabled: combineEnabled(!!organization || orgNotRequired(), queryOptions?.enabled),
  });

  // Read from the cache rather than `result.data`, which a caller's `select`
  // may have reshaped.
  const cached = queryClient.getQueryData<InfiniteData<QueryResponse<T>, number>>(queryKey);
  const pagination = cached?.pages.length ? cached.pages[cached.pages.length - 1].pagination : null;

  // TanStack Query re-renders only for the result properties a component has
  // read, so the result is extended in place of being copied (a spread would
  // read them all), and reading `pagination` counts as reading `data`.
  return new Proxy(result, {
    get: (target, key) => {
      if (key !== 'pagination') return Reflect.get(target, key);
      void Reflect.get(target, 'data');
      return pagination;
    },
    has: (target, key) => key === 'pagination' || Reflect.has(target, key),
  }) as UseInfiniteQueryResult<TData, Error> & { pagination: PaginationMeta | null };
}

/**
 * Hook to fetch a single model (show)
 *
 * @example
 * // Simple usage
 * useModelShow('users', 1)
 *
 * // With typed model
 * useModelShow<Post>('posts', 1, {
 *   includes: ['author', 'comments'],
 *   fields: ['id', 'title', 'content']
 * })
 *
 * Note: `scope` is intentionally NOT applied to show — the backends do not
 * scope single-resource reads, so it is omitted here even if passed in options.
 */
export function useModelShow<T = Record<string, any>, TData = T>(
  model: string,
  id: string | number | null | undefined,
  options: ModelQueryOptions = {},
  queryOptions?: ModelQueryHookOptions<T, TData>,
): UseQueryResult<TData, Error> {
  const organization = useOrganization();

  return useQuery<T, Error, TData>({
    ...queryOptions,
    queryKey: modelKeys.show(model, id, options, organization ?? null),
    queryFn: () => fetchModelShow<T>(model, id as string | number, options, { organization: organization ?? null }),
    enabled: combineEnabled(
      (!!organization && !!String(organization).trim() || orgNotRequired()) && !!id,
      queryOptions?.enabled,
    ),
  });
}

/**
 * Hook to update a model
 *
 * @example
 * const updatePost = useModelUpdate<Post>('posts');
 * updatePost.mutate({ id: 1, data: { title: 'Updated' } });
 *
 * // With a file: pass FormData. It is sent as a multipart POST carrying
 * // `X-HTTP-Method-Override: PUT`.
 * const form = new FormData();
 * form.append('cover', file);
 * updatePost.mutate({ id: 1, data: form });
 */
export function useModelUpdate<T = Record<string, any>, TContext = unknown>(
  model: string,
  mutationOptions?: ModelMutationHookOptions<T, { id: string | number; data: Partial<T> | FormData }, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, { id: string | number; data: Partial<T> | FormData }, TContext>({
    ...withInvalidation(mutationOptions, () => {
      invalidateLists(queryClient, model);
      queryClient.invalidateQueries({ queryKey: modelKeys.show(model) });
    }),
    mutationFn: ({ id, data }) => {
      const url = `${buildResourceBase(model, organization)}/${id}`;
      if (isFormData(data)) {
        // A caller that put its own `_method` in the form keeps full control of
        // the override; otherwise the header carries it.
        const config = formDataHas(data, '_method') ? MULTIPART_CONFIG : MULTIPART_PUT_CONFIG;
        return api.post(url, data, config).then((res: AxiosResponse) => res.data);
      }
      return api.put(url, data).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to delete a model
 *
 * @example
 * const deletePost = useModelDelete<Post>('posts');
 * deletePost.mutate(postId);
 */
export function useModelDelete<T = Record<string, any>, TContext = unknown>(
  model: string,
  mutationOptions?: ModelMutationHookOptions<T, string | number, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number, TContext>({
    ...withInvalidation(mutationOptions, () => {
      invalidateLists(queryClient, model);
      queryClient.invalidateQueries({ queryKey: modelKeys.show(model) });
    }),
    mutationFn: (id) => {
      const url = `${buildResourceBase(model, organization)}/${id}`;
      return api.delete(url).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to create a new model
 *
 * @example
 * const createUser = useModelStore<User>('users');
 * createUser.mutate({ name: 'John Doe', email: 'john@example.com' });
 *
 * // With a file: pass FormData and it is sent as multipart
 * const form = new FormData();
 * form.append('avatar', file);
 * createUser.mutate(form);
 */
export function useModelStore<T = Record<string, any>, TContext = unknown>(
  model: string,
  mutationOptions?: ModelMutationHookOptions<T, Partial<T> | FormData, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, Partial<T> | FormData, TContext>({
    ...withInvalidation(mutationOptions, () => {
      invalidateLists(queryClient, model);
      queryClient.invalidateQueries({ queryKey: modelKeys.show(model) });
    }),
    mutationFn: (data) => {
      const url = buildResourceBase(model, organization);
      if (isFormData(data)) {
        return api.post(url, data, MULTIPART_CONFIG).then((res: AxiosResponse) => res.data);
      }
      return api.post(url, data).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to fetch COLLECTION-level computed attributes (aggregates).
 *
 * Hits `GET /{model}/computed?attributes=…`, where each attribute is evaluated
 * ONCE for the whole collection instead of once per row — the cheap way to show
 * counts and sums. Filters, search and scope narrow the set the aggregates
 * describe, exactly as they narrow `useModelIndex`.
 *
 * Returns the attribute object itself, e.g. `{ active_users_count: 12 }`.
 *
 * @example
 * const { data: stats } = useModelComputedAttributes('users', {
 *   attributes: ['active_users_count', 'blocked_users_count'],
 * });
 * stats?.active_users_count;
 *
 * @example
 * // Attributes that declare parameters take an object: name => arguments
 * const { data: stats } = useModelComputedAttributes('orders', {
 *   attributes: { revenue: { from: '2026-01-01', to: '2026-02-01' }, activeUsersCount: null },
 * });
 * // ?attributes[revenue][from]=2026-01-01&attributes[revenue][to]=2026-02-01&attributes[activeUsersCount]=
 *
 * @example
 * // Aggregates over the same set the current list is showing
 * const { data: stats } = useModelComputedAttributes('users', {
 *   attributes: ['active_users_count'],
 *   filters: { team_id: 3 },
 *   search: term,
 * });
 */
export function useModelComputedAttributes<T = Record<string, any>, TData = T>(
  model: string,
  options: ComputedAttributesOptions = {},
  queryOptions?: ModelQueryHookOptions<T, TData>,
): UseQueryResult<TData, Error> {
  const organization = useOrganization();

  return useQuery<T, Error, TData>({
    ...queryOptions,
    queryKey: modelKeys.computed(model, options, organization ?? null),
    queryFn: () => fetchModelComputedAttributes<T>(model, options, { organization: organization ?? null }),
    enabled: combineEnabled(!!organization || orgNotRequired(), queryOptions?.enabled),
  });
}

/**
 * Hook to fetch soft-deleted (trashed) models
 *
 * @example
 * const { data: response } = useModelTrashed<Post>('posts', {
 *   search: 'deleted',
 *   page: 1,
 *   perPage: 20,
 *   sort: '-deleted_at'
 * });
 * const trashedPosts = response?.data || []; // Post[]
 */
export function useModelTrashed<T = Record<string, any>, TData = QueryResponse<T>>(
  model: string,
  options: ModelQueryOptions = {},
  queryOptions?: ModelQueryHookOptions<QueryResponse<T>, TData>,
): UseQueryResult<TData, Error> {
  const organization = useOrganization();

  return useQuery<QueryResponse<T>, Error, TData>({
    ...queryOptions,
    queryKey: modelKeys.trashed(model, options, organization ?? null),
    queryFn: () => fetchModelTrashed<T>(model, options, { organization: organization ?? null }),
    enabled: combineEnabled(!!organization || orgNotRequired(), queryOptions?.enabled),
  });
}

/**
 * Hook to restore a soft-deleted model
 *
 * @example
 * const restoreUser = useModelRestore<User>('users');
 * restoreUser.mutate(userId);
 */
export function useModelRestore<T = Record<string, any>, TContext = unknown>(
  model: string,
  mutationOptions?: ModelMutationHookOptions<T, string | number, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number, TContext>({
    ...withInvalidation(mutationOptions, () => {
      invalidateLists(queryClient, model);
      queryClient.invalidateQueries({ queryKey: modelKeys.trashed(model) });
      queryClient.invalidateQueries({ queryKey: modelKeys.show(model) });
    }),
    mutationFn: (id) => {
      const url = `${buildResourceBase(model, organization)}/${id}/restore`;
      return api.post(url).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to permanently delete a model (force delete)
 *
 * @example
 * const forceDeleteUser = useModelForceDelete<User>('users');
 * forceDeleteUser.mutate(userId);
 */
export function useModelForceDelete<T = Record<string, any>, TContext = unknown>(
  model: string,
  mutationOptions?: ModelMutationHookOptions<T, string | number, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number, TContext>({
    ...withInvalidation(mutationOptions, () => {
      queryClient.invalidateQueries({ queryKey: modelKeys.trashed(model) });
    }),
    mutationFn: (id) => {
      const url = `${buildResourceBase(model, organization)}/${id}/force-delete`;
      return api.delete(url).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to perform nested operations (multi-model transactions)
 *
 * @example
 * const nestedOps = useNestedOperations();
 * nestedOps.mutate({
 *   operations: [
 *     { action: 'create', model: 'blogs', data: { title: 'My Blog' } },
 *     { action: 'update', model: 'posts', id: 1, data: { title: 'Updated' } },
 *     { action: 'create', model: 'posts', data: { title: 'New Post', blog_id: '$0.id' } }
 *   ]
 * });
 */
export function useNestedOperations<TContext = unknown>(
  mutationOptions?: ModelMutationHookOptions<any[], { operations: NestedOperation[] }, TContext>,
) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<any[], Error, { operations: NestedOperation[] }, TContext>({
    ...withInvalidation(mutationOptions, (_data: any[], variables: { operations: NestedOperation[] }) => {
      const affectedModels = new Set(
        variables.operations.map(op => op.model)
      );

      affectedModels.forEach(model => {
        invalidateLists(queryClient, model);
        queryClient.invalidateQueries({ queryKey: modelKeys.show(model) });
      });
    }),
    mutationFn: ({ operations }) => {
      // The nested endpoint is a fixed path, not a model; treat it like one so it
      // follows tenancy (`/{org}/nested`, or `/nested` with no org segment).
      const url = buildResourceBase(apiConfig.nestedPath, organization);
      return api.post(url, { operations }).then((res: AxiosResponse) => res.data);
    },
  });
}

/**
 * Hook to fetch audit logs for a model instance
 *
 * @example
 * const { data: response } = useModelAudit('users', 1, { page: 1, perPage: 50 });
 * const auditLogs = response?.data || []; // AuditLog[]
 */
export function useModelAudit<TData = QueryResponse<AuditLog>>(
  model: string,
  id: string | number | null | undefined,
  options: ModelQueryOptions = {},
  queryOptions?: ModelQueryHookOptions<QueryResponse<AuditLog>, TData>,
): UseQueryResult<TData, Error> {
  const organization = useOrganization();

  return useQuery<QueryResponse<AuditLog>, Error, TData>({
    ...queryOptions,
    queryKey: modelKeys.audit(model, id, options, organization ?? null),
    queryFn: () => fetchModelAudit(model, id as string | number, options, { organization: organization ?? null }),
    enabled: combineEnabled((!!organization || orgNotRequired()) && !!id, queryOptions?.enabled),
  });
}
