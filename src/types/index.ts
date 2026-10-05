/**
 * TypeScript type definitions for @rhino/client
 */

import type {
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

/**
 * TanStack Query options accepted as the trailing parameter of the query hooks
 * (`useModelIndex`, `useModelShow`, `useModelTrashed`, `useModelComputedAttributes`,
 * `useModelAudit`): everything `useQuery` takes except `queryKey` and `queryFn`,
 * which the hook owns. `enabled` is AND-ed with the hook's own guard.
 */
export type ModelQueryHookOptions<TQueryFnData, TData = TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TData>,
  'queryKey' | 'queryFn'
>;

/**
 * TanStack Query options accepted by `useModelInfinite`: everything
 * `useInfiniteQuery` takes except the key, the fetcher and the page-param
 * functions, which the hook derives from the pagination headers.
 */
export type ModelInfiniteQueryHookOptions<TQueryFnData, TData> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, Error, TData, QueryKey, number>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam' | 'getPreviousPageParam'
>;

/**
 * TanStack Query options accepted as the trailing parameter of the mutation
 * hooks: everything `useMutation` takes except `mutationFn`. The hook's cache
 * invalidation runs before the `onSuccess` given here.
 */
export type ModelMutationHookOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, Error, TVariables, TContext>,
  'mutationFn'
>;

/** What `buildModelUrl` should address besides the model itself. */
export interface BuildModelUrlTarget {
  /** Record id — a show URL, or with `suffix: 'audit'` an audit URL. */
  id?: string | number | null;
  /** Organization slug. Read from storage when omitted. */
  organization?: string | null;
  /** Path suffix: `'computed'`, `'trashed'`, `'audit'`, or any other trailing segment. */
  suffix?: string;
}

/** Context for the plain fetchers (`fetchModelIndex`, `fetchModelShow`). */
export interface ModelFetchContext {
  /** Organization slug. Read from storage when omitted. */
  organization?: string | null;
}

/**
 * Pagination metadata extracted from API response headers
 */
export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

/**
 * A named-scope selection: scope name => its arguments. Use `null` (or an empty
 * string) for a scope that takes none, a bare value for a scope with one
 * declared parameter, and an object of parameter name => value for several.
 */
export type ScopeSelection = Record<
  string,
  string | number | boolean | null | Record<string, string | number | boolean>
>;

/**
 * A computed-attribute selection: attribute name => its arguments. Use `null`
 * (or an empty string) for an attribute that takes none, a bare value for one
 * with a single declared parameter, and an object of parameter name => value
 * for several. Same shape as `ScopeSelection`.
 */
export type ComputedAttributeSelection = Record<
  string,
  string | number | boolean | null | Record<string, string | number | boolean>
>;

/**
 * Query options for model index/list operations
 */
export interface ModelQueryOptions {
  /** Filter by field values */
  filters?: Record<string, any>;
  /** Eager load relationships */
  includes?: string[];
  /** Sort field (prefix with - for descending) */
  sort?: string;
  /** Select specific fields */
  fields?: string[];
  /** Full-text search query */
  search?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
  /** Items per page (alternative name) */
  per_page?: number;
  /**
   * Server-defined named scope(s) to apply. Only scopes whitelisted on the
   * model server-side AND permitted by its policy are accepted; anything else
   * returns 403.
   *
   * A bare name serializes as `?scope=<name>`:
   *     scope: 'availableForDrivers'
   *
   * An object serializes as `?scope[<name>]=...`, which is how a scope receives
   * arguments. A single declared parameter takes a bare value, and several take
   * named keys:
   *     scope: { archived: null }                       // no arguments
   *     scope: { since: '2026-01-01' }                  // one parameter
   *     scope: { window: { from: 'a', to: 'b' } }       // named parameters
   *
   * Up to three scopes may be combined in the object form, and they apply in
   * key order.
   */
  scope?: string | ScopeSelection;
  /**
   * OPT-IN record-level computed attributes to include on each returned record
   * (e.g. ['full_name']). Nothing is computed server-side unless named here, so
   * expensive per-row work is only paid for when you ask for it. Only attributes
   * declared on the model AND allowed by the policy are accepted; anything else
   * returns 403.
   *
   * An array serializes as `?computed_attributes=a,b`:
   *     computedAttributes: ['full_name', 'avatar_url']
   *
   * An object serializes as `?computed_attributes[<name>]=...`, which is how an
   * attribute receives arguments. A single declared parameter takes a bare
   * value, several take named keys, and `null` means no arguments (the form to
   * use when combining it with one that takes some):
   *     computedAttributes: { full_name: null }                    // no arguments
   *     computedAttributes: { ticketsSince: '2026-01-01' }         // one parameter
   *     computedAttributes: { revenue: { from: 'a', to: 'b' } }    // named parameters
   *
   * For aggregates over the whole collection (counts, sums) use
   * `useModelComputedAttributes` instead — those are evaluated once, not per row.
   */
  computedAttributes?: string[] | ComputedAttributeSelection;
}

/**
 * Options for `useModelComputedAttributes` — the collection-level aggregates
 * endpoint. Filters, search and scope narrow the set the aggregates describe,
 * exactly as they would narrow `useModelIndex`.
 */
export interface ComputedAttributesOptions {
  /**
   * Which collection-level computed attributes to fetch (e.g.
   * ['active_users_count']). Omit to fetch every attribute the policy allows.
   *
   * An array serializes as `?attributes=a,b`. An object serializes as
   * `?attributes[<name>]=...`, which is how an attribute receives arguments —
   * a bare value for one declared parameter, named keys for several, and
   * `null` for none:
   *     attributes: { revenue: { from: 'a', to: 'b' }, activeUsersCount: null }
   *     // ?attributes[revenue][from]=a&attributes[revenue][to]=b&attributes[activeUsersCount]=
   */
  attributes?: string[] | ComputedAttributeSelection;
  /** Filter by field values — narrows the set the aggregates describe. */
  filters?: Record<string, any>;
  /** Full-text search query — narrows the set the aggregates describe. */
  search?: string;
  /** Server-defined named scope(s) — narrows the set the aggregates describe. */
  scope?: string | ScopeSelection;
}

/**
 * Nested operation for multi-model transactions
 */
export interface NestedOperation {
  /** Operation type */
  action: 'create' | 'update' | 'delete';
  /** Model name */
  model: string;
  /** Resource ID (for update/delete) */
  id?: string | number;
  /** Data payload (for create/update) */
  data?: Record<string, any>;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: number;
  /** Action performed (created, updated, deleted, etc.) */
  action: string;
  /** User who performed the action */
  user_id: number;
  /** Model type */
  model_type: string;
  /** Model ID */
  model_id: number;
  /** Previous values before change */
  old_values?: Record<string, any>;
  /** New values after change */
  new_values?: Record<string, any>;
  /** Timestamp */
  created_at: string;
}

/**
 * A route group identifier (e.g. 'driver', 'admin'). `null` means the default
 * unprefixed `/auth/*` group.
 */
export type RouteGroup = string | null;

/**
 * Multitenancy mode controlling how the data hooks convey the organization to the
 * backend.
 *
 * - `'path'` (default): the org slug is prepended as a URL path segment
 *   (`/api/{org}/{model}`) — path-prefix multitenancy.
 * - `'subdomain'`: the org is carried by the request HOST (e.g. `{org}.example.com`),
 *   so the data hooks build `/api/{model}` with NO org segment.
 * - `'none'`: there is no organization at all (e.g. a prefix route group without a
 *   tenant), so the data hooks build `/api/{model}` and require no org.
 */
export type TenancyMode = 'path' | 'subdomain' | 'none';

/**
 * Per-call options for `login` / `logout`.
 */
export interface LoginOptions {
  /** Route group override for this call (defaults to the configured/provider group). */
  routeGroup?: RouteGroup;
}

/**
 * Login result from authentication
 */
export interface LoginResult {
  success: boolean;
  user?: any;
  organization?: { slug: string };
  organization_slug?: string;
  /** The route group the user logged into, if any (group-aware auth). */
  route_group?: RouteGroup;
  /** The bearer token of the session that was started. Already in storage when `login()` resolves. */
  token?: string | null;
  error?: string;
  /**
   * The HTTP status of the login response. On failure this lets callers
   * distinguish e.g. 401 (bad credentials) from 403 (group membership denied).
   */
  status?: number;
}

/**
 * Query response with data and pagination
 */
export interface QueryResponse<T> {
  data: T[];
  pagination: PaginationMeta | null;
}

/**
 * Invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

/**
 * Invitation object
 */
export interface Invitation {
  id: number;
  email: string;
  role_id: number;
  role?: {
    id: number;
    name: string;
  };
  status: InvitationStatus;
  invited_by?: {
    id: number;
    name: string;
  };
  /** The route group the invitee will join (group-aware invitations). */
  route_group?: RouteGroup;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Organization object
 */
export interface Organization {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  users?: User[];
}

/**
 * User object
 */
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  pivot?: {
    role_id: number;
    [key: string]: any;
  };
  organizations?: Organization[];
}

/**
 * Role object
 */
export interface Role {
  id: number;
  name: string;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}
