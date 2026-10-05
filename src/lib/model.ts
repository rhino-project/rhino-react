/**
 * React-free building blocks behind the model hooks: URL building, query keys
 * and plain async fetchers. The hooks in `hooks/useModel.ts` are thin wrappers
 * over these, so code that runs outside React (push-notification handlers,
 * background tasks, prefetching) produces the same URLs and cache keys.
 */
import api, { getTenancy } from './axios';
import { dataPathPrefix } from './api-config';
import { storage } from './storage';
import { extractPaginationFromHeaders } from './pagination';
import { normalizeList, normalizeOne } from './normalize-response';
import type {
  ModelQueryOptions,
  QueryResponse,
  AuditLog,
  ComputedAttributesOptions,
  ComputedAttributeSelection,
  ScopeSelection,
  BuildModelUrlTarget,
  ModelFetchContext,
} from '../types';

/**
 * Serialize a name => arguments selection in the bracket wire form under
 * `key`: `key[<name>]=` for an entry that takes no arguments (null, undefined
 * or ''), `key[<name>]=<value>` for a bare value bound to a single declared
 * parameter, and `key[<name>][<param>]=<value>` per key for named parameters.
 * Booleans go out as "true"/"false". Entries are emitted in key order.
 */
function appendBracketSelection(
  params: URLSearchParams,
  key: string,
  selection: ScopeSelection | ComputedAttributeSelection,
): void {
  Object.entries(selection).forEach(([name, value]) => {
    if (value === null || value === undefined || value === '') {
      params.append(`${key}[${name}]`, '');
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([param, argument]) => {
        params.append(`${key}[${name}][${param}]`, String(argument));
      });
      return;
    }

    params.append(`${key}[${name}]`, String(value));
  });
}

/**
 * Serialize the `scope` option.
 *
 * A bare name goes out as `?scope=<name>`, the form every Rhino version has
 * accepted. An object goes out as `?scope[<name>]=...`, which is how a scope
 * receives arguments: a bare value for a scope with one declared parameter,
 * `scope[<name>][<param>]=` for several, and an empty value for a scope that
 * takes none (the form to use when combining it with one that does).
 */
function appendScope(
  params: URLSearchParams,
  scope: string | ScopeSelection | undefined,
): void {
  if (!scope) return;
  if (typeof scope === 'string') {
    params.append('scope', scope);
    return;
  }
  appendBracketSelection(params, 'scope', scope);
}

/**
 * Serialize a computed-attribute selection under `key` (`computed_attributes`
 * on index/show/trashed, `attributes` on `/computed`).
 *
 * An array goes out as the comma list `?key=a,b`, the form every Rhino version
 * has accepted; an empty array emits nothing. An object goes out in the
 * bracket form `?key[<name>]=...`, which is how an attribute receives
 * arguments — see `appendBracketSelection`. A no-argument entry keeps its
 * trailing `=` (`key[<name>]=`), which the server requires.
 */
function appendComputedSelection(
  params: URLSearchParams,
  key: string,
  value: string[] | ComputedAttributeSelection | undefined,
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    if (value.length > 0) {
      params.append(key, value.join(','));
    }
    return;
  }
  appendBracketSelection(params, key, value);
}

function appendFilters(params: URLSearchParams, filters: Record<string, any> | undefined): void {
  if (!filters) return;
  Object.entries(filters).forEach(([key, value]) => {
    params.append(`filter[${key}]`, value);
  });
}

function appendPagination(params: URLSearchParams, options: ModelQueryOptions): void {
  if (options.page) {
    params.append('page', String(options.page));
  }
  if (options.perPage || options.per_page) {
    params.append('per_page', String(options.perPage || options.per_page));
  }
}

/** Query string of a list request (index and trashed). */
function appendListParams(params: URLSearchParams, options: ModelQueryOptions): void {
  appendFilters(params, options.filters);
  if (options.includes && options.includes.length > 0) {
    params.append('include', options.includes.join(','));
  }
  if (options.sort) {
    params.append('sort', options.sort);
  }
  if (options.fields && options.fields.length > 0) {
    params.append('fields', options.fields.join(','));
  }
  if (options.search) {
    params.append('search', options.search);
  }
  appendScope(params, options.scope);
  appendComputedSelection(params, 'computed_attributes', options.computedAttributes);
  appendPagination(params, options);
}

/**
 * Query string of a single-record request. `scope` is intentionally NOT applied
 * to show — the backends do not scope single-resource reads.
 */
function appendShowParams(params: URLSearchParams, options: ModelQueryOptions): void {
  if (options.includes && options.includes.length > 0) {
    params.append('include', Array.isArray(options.includes) ? options.includes.join(',') : options.includes);
  }
  appendFilters(params, options.filters);
  if (options.sort) {
    params.append('sort', options.sort);
  }
  if (options.fields && options.fields.length > 0) {
    params.append('fields', Array.isArray(options.fields) ? options.fields.join(',') : options.fields);
  }
  appendComputedSelection(params, 'computed_attributes', options.computedAttributes);
}

/** Query string of the collection-level `/computed` request. */
function appendComputedParams(params: URLSearchParams, options: ComputedAttributesOptions): void {
  appendComputedSelection(params, 'attributes', options.attributes);
  appendFilters(params, options.filters);
  if (options.search) {
    params.append('search', options.search);
  }
  appendScope(params, options.scope);
}

function withQuery(url: string, params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Whether the data hooks may run without an organization in context.
 *
 * In `'subdomain'` mode the org is carried by the request host and in `'none'`
 * mode there is no org at all, so hooks/mutations do NOT require one. In the
 * default `'path'` mode the org is a URL segment and is still required.
 */
export function orgNotRequired(): boolean {
  const tenancy = getTenancy();
  return tenancy === 'subdomain' || tenancy === 'none';
}

/**
 * Build the resource base path for a model, honoring the configured tenancy
 * mode and the `routeGroupInDataPath` option.
 *
 * - `'path'` (default): `/{org}/{model}` — the org slug is a URL path segment
 *   (path-prefix multitenancy).
 * - `'subdomain'`: `/{model}` — the org is carried by the request HOST, so no org
 *   segment is prepended and no org is required in context.
 * - `'none'`: `/{model}` — there is no org at all.
 *
 * With `routeGroupInDataPath` the configured route group comes first:
 * `/{routeGroup}/{org}/{model}` or `/{routeGroup}/{model}`.
 *
 * @param model - The model slug (e.g. 'users').
 * @param organization - The current org slug (required only in `'path'` mode).
 */
export function buildResourceBase(model: string, organization: string | null | undefined): string {
  const prefix = dataPathPrefix();
  if (orgNotRequired()) {
    return `${prefix}/${model}`;
  }
  const orgSlug = String(organization ?? '').trim();
  if (!orgSlug) {
    throw new Error('Organization slug is required and must be a non-empty string');
  }
  return `${prefix}/${orgSlug}/${model}`;
}

/** The organization to use when the caller did not pass one: the stored slug. */
function resolveOrganization(organization: string | null | undefined): string | null {
  return organization === undefined ? storage.getItem('organization_slug') : organization;
}

/**
 * Build the URL a model hook requests, relative to the API base URL.
 *
 * | Target | Call | URL (default tenancy) |
 * |---|---|---|
 * | index | `buildModelUrl('posts', options)` | `/{org}/posts?…` |
 * | show | `buildModelUrl('posts', options, { id })` | `/{org}/posts/{id}?…` |
 * | computed | `buildModelUrl('posts', options, { suffix: 'computed' })` | `/{org}/posts/computed?…` |
 * | trashed | `buildModelUrl('posts', options, { suffix: 'trashed' })` | `/{org}/posts/trashed?…` |
 * | audit | `buildModelUrl('posts', options, { id, suffix: 'audit' })` | `/{org}/posts/{id}/audit?…` |
 *
 * Each target serializes the options its hook serializes (a show URL carries no
 * `scope`, `search` or pagination; an audit URL carries pagination only). Any
 * other suffix (e.g. `'restore'`) yields the bare path.
 *
 * Works outside React: when `organization` is not passed it is read from
 * storage. Tenancy and `routeGroupInDataPath` are honored.
 */
export function buildModelUrl(
  model: string,
  options: ModelQueryOptions | ComputedAttributesOptions = {},
  target: BuildModelUrlTarget = {},
): string {
  const { id, suffix } = target;
  const hasId = id !== undefined && id !== null && id !== '';
  const organization = resolveOrganization(target.organization);

  let path = buildResourceBase(model, organization);
  if (hasId) path += `/${id}`;
  if (suffix) path += `/${suffix}`;

  const params = new URLSearchParams();
  if (suffix === 'computed') {
    appendComputedParams(params, options as ComputedAttributesOptions);
  } else if (suffix === 'audit') {
    appendPagination(params, options as ModelQueryOptions);
  } else if (suffix === 'trashed' || (!suffix && !hasId)) {
    appendListParams(params, options as ModelQueryOptions);
  } else if (!suffix) {
    appendShowParams(params, options as ModelQueryOptions);
  }

  return withQuery(path, params);
}

/** A cache filter matching every query of one model. */
export interface ModelQueryFilter {
  predicate: (query: { queryKey: readonly unknown[] }) => boolean;
}

const MODEL_KEY_ROOTS = [
  'modelIndex',
  'modelInfinite',
  'modelShow',
  'modelComputedAttributes',
  'modelTrashed',
  'modelAudit',
] as const;

/**
 * The query keys the model hooks register.
 *
 * Called with every argument, a method returns the exact key its hook uses
 * (`organization` defaults to the stored slug, which is what the hook reads).
 * Called with fewer, it returns a prefix for invalidation:
 *
 *     modelKeys.index('posts')                 // ['modelIndex', 'posts'] — every posts list
 *     modelKeys.index('posts', { page: 2 })    // the key of useModelIndex('posts', { page: 2 })
 *     modelKeys.show('posts')                  // every posts record
 *     modelKeys.show('posts', 5)               // every query of post 5
 *     modelKeys.show('posts', 5, {})           // the key of useModelShow('posts', 5)
 *
 * A hook called without options uses `{}`, so pass `{}` for its exact key.
 *
 * `modelKeys.all(model)` is a filter rather than a key, because the hooks' keys
 * do not share a single prefix: `queryClient.invalidateQueries(modelKeys.all('posts'))`.
 */
export const modelKeys = {
  index: (model: string, options?: ModelQueryOptions, organization?: string | null) =>
    options === undefined
      ? (['modelIndex', model] as const)
      : (['modelIndex', model, resolveOrganization(organization), options] as const),

  infinite: (model: string, options?: ModelQueryOptions, organization?: string | null) =>
    options === undefined
      ? (['modelInfinite', model] as const)
      : (['modelInfinite', model, resolveOrganization(organization), options] as const),

  show: (
    model: string,
    id?: string | number | null,
    options?: ModelQueryOptions,
    organization?: string | null,
  ) => {
    if (id === undefined && options === undefined) return ['modelShow', model] as const;
    if (options === undefined) return ['modelShow', model, id] as const;
    return ['modelShow', model, id, resolveOrganization(organization), options] as const;
  },

  computed: (model: string, options?: ComputedAttributesOptions, organization?: string | null) =>
    options === undefined
      ? (['modelComputedAttributes', model] as const)
      : (['modelComputedAttributes', model, resolveOrganization(organization), options] as const),

  trashed: (model: string, options?: ModelQueryOptions, organization?: string | null) =>
    options === undefined
      ? (['modelTrashed', model] as const)
      : (['modelTrashed', model, resolveOrganization(organization), options] as const),

  audit: (
    model: string,
    id?: string | number | null,
    options?: ModelQueryOptions,
    organization?: string | null,
  ) => {
    if (id === undefined && options === undefined) return ['modelAudit', model] as const;
    if (options === undefined) return ['modelAudit', model, id] as const;
    return ['modelAudit', model, id, resolveOrganization(organization), options] as const;
  },

  all: (model: string): ModelQueryFilter => ({
    predicate: (query) =>
      (MODEL_KEY_ROOTS as readonly unknown[]).includes(query.queryKey[0]) &&
      query.queryKey[1] === model,
  }),
};

/**
 * Fetch one page of a model's list — the request `useModelIndex` makes.
 *
 * @example
 * await queryClient.prefetchQuery({
 *   queryKey: modelKeys.index('trips', options),
 *   queryFn: () => fetchModelIndex<Trip>('trips', options),
 * });
 */
export async function fetchModelIndex<T = Record<string, any>>(
  model: string,
  options: ModelQueryOptions = {},
  context: ModelFetchContext = {},
): Promise<QueryResponse<T>> {
  const organization = resolveOrganization(context.organization);
  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required');
  }

  const response = await api.get(buildModelUrl(model, options, { organization }));
  const pagination = extractPaginationFromHeaders(response);

  return {
    data: normalizeList<T>(response.data),
    pagination,
  };
}

/**
 * Fetch a single record — the request `useModelShow` makes.
 *
 * @example
 * const trip = await queryClient.fetchQuery({
 *   queryKey: modelKeys.show('trips', id, {}),
 *   queryFn: () => fetchModelShow<Trip>('trips', id),
 * });
 */
export async function fetchModelShow<T = Record<string, any>>(
  model: string,
  id: string | number,
  options: ModelQueryOptions = {},
  context: ModelFetchContext = {},
): Promise<T> {
  const organization = String(resolveOrganization(context.organization) ?? '').trim();
  if (!organization && !orgNotRequired()) {
    throw new Error('Organization slug is required. Please ensure you are logged in and have selected an organization.');
  }

  const response = await api.get(buildModelUrl(model, options, { id, organization }));
  return normalizeOne<T>(response.data);
}

/** Fetch collection-level computed attributes — the request `useModelComputedAttributes` makes. */
export async function fetchModelComputedAttributes<T = Record<string, any>>(
  model: string,
  options: ComputedAttributesOptions = {},
  context: ModelFetchContext = {},
): Promise<T> {
  const organization = String(resolveOrganization(context.organization) ?? '').trim();
  const response = await api.get(buildModelUrl(model, options, { organization, suffix: 'computed' }));
  return normalizeOne<T>(response.data);
}

/** Fetch one page of soft-deleted records — the request `useModelTrashed` makes. */
export async function fetchModelTrashed<T = Record<string, any>>(
  model: string,
  options: ModelQueryOptions = {},
  context: ModelFetchContext = {},
): Promise<QueryResponse<T>> {
  const organization = String(resolveOrganization(context.organization) ?? '').trim();
  const response = await api.get(buildModelUrl(model, options, { organization, suffix: 'trashed' }));
  const pagination = extractPaginationFromHeaders(response);

  return {
    data: normalizeList<T>(response.data),
    pagination,
  };
}

/** Fetch one page of a record's audit log — the request `useModelAudit` makes. */
export async function fetchModelAudit(
  model: string,
  id: string | number,
  options: ModelQueryOptions = {},
  context: ModelFetchContext = {},
): Promise<QueryResponse<AuditLog>> {
  const organization = String(resolveOrganization(context.organization) ?? '').trim();
  const response = await api.get(buildModelUrl(model, options, { id, organization, suffix: 'audit' }));
  const pagination = extractPaginationFromHeaders(response);

  return {
    data: normalizeList<AuditLog>(response.data),
    pagination,
  };
}
