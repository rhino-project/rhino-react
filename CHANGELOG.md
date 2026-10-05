# Changelog

All notable changes to @rhino-dev/rhino-react will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.7.0] - 2026-10-05

Nothing is required to upgrade from 4.6: with no new option passed, URLs,
request bodies and query keys are unchanged. The behaviors that differ
without opting in are listed under **Changed**.

### Added

- **TanStack Query options on every hook.** The query hooks take an optional
  trailing `queryOptions` (`useModelIndex(model, options?, queryOptions?)`,
  `useModelShow(model, id, options?, queryOptions?)`, `useModelTrashed`,
  `useModelComputedAttributes`, `useModelAudit`): everything `useQuery` accepts
  except `queryKey` and `queryFn` — `enabled`, `refetchInterval`, `staleTime`,
  `gcTime`, `placeholderData`, `select`, `retry`, … `enabled` (a boolean or the
  v5 function form) is AND-ed with the hook's own guard (organization present,
  id present), so it can narrow that guard but never widen it. `select` flows
  into the return type through a second generic
  (`useModelIndex<Post, string[]>(…)`). Query keys do not include `queryOptions`.
- **Mutation options.** `useModelStore`, `useModelUpdate`, `useModelDelete`,
  `useModelRestore`, `useModelForceDelete` and `useNestedOperations` take an
  optional trailing `mutationOptions` (everything `useMutation` accepts except
  `mutationFn`). The built-in cache invalidation always runs first, then the
  given `onSuccess`. Callbacks passed to `mutate()` work as before.
- **File uploads.** `useModelStore` and `useModelUpdate` accept a `FormData`
  body and send it as multipart. An update with `FormData` goes out as
  `POST {url}/{id}` with the header `X-HTTP-Method-Override: PUT`, because PHP
  does not parse a multipart body on `PUT`. The override is a header and not a
  `_method` form field on purpose: Rhino treats every form field as an
  attribute and answers 403 to `_method` when the policy restricts the
  writable attributes. A form that already contains `_method` is sent as is,
  without the header. JSON bodies are sent exactly as before.
- **`useModelInfinite(model, options?, queryOptions?)`** — accumulates pages on
  `useInfiniteQuery` for "load more" lists. The next page comes from the
  pagination headers and there is none after the last page; `options.page` is
  ignored and `perPage` is respected. Returns the standard infinite-query
  result plus `pagination` (of the last loaded page). Every mutation that
  invalidates a model's `useModelIndex` lists now invalidates its infinite
  lists too.
- **`tenancy: 'none'`** — no organization segment and no organization required,
  for apps without tenants. `'path'` and `'subdomain'` are unchanged.
- **`configureApi({ routeGroupInDataPath: true })`** — also prepends the
  configured `routeGroup` to data URLs: `/{routeGroup}/{model}` with
  `tenancy: 'none'` and `/{routeGroup}/{organization}/{model}` with
  `tenancy: 'path'`. Off by default. Followed by every model hook, by
  `useNestedOperations`, and by the tenant-only hooks (`useOwner`,
  `useUserRole`, `useInvitations`, `useInviteUser`, `useResendInvitation`,
  `useCancelInvitation`), which keep their organization segment in every mode.
  `getRouteGroupInDataPath()` reads the setting.
- **`configureApi({ nestedPath })`** — the path segment `useNestedOperations`
  posts to, for servers with a custom `nested.path`. See **Fixed** for the
  default.
- **`configureApi({ timeout, withCredentials })`**, applied to the axios
  instance defaults. The defaults stay `withCredentials: true` and no timeout.
- **URL building, query keys and fetchers usable outside React:**
  `buildModelUrl(model, options?, { id?, organization?, suffix? })`,
  the `modelKeys` factory (`index`, `infinite`, `show`, `computed`, `trashed`,
  `audit`, `all`), and `fetchModelIndex` / `fetchModelShow` for
  `queryClient.fetchQuery` / `prefetchQuery`. The hooks are built on them, so
  the URLs and keys cannot drift.
- `LoginResult.token` — the token of the session `login()` started.
- `STORAGE_KEYS` — every storage key the library uses.
- Types: `ModelQueryHookOptions`, `ModelInfiniteQueryHookOptions`,
  `ModelMutationHookOptions`, `BuildModelUrlTarget`, `ModelFetchContext`,
  `ModelQueryFilter`; `TenancyMode` gains `'none'`.

### Changed

- **A 401 now ends the session in `AuthProvider` too.** On a 401 the API client
  removes `token` and `user` from storage and emits a `token` event;
  `AuthProvider` listens and resets, so `useAuth().isAuthenticated` turns
  `false`. Previously only the stored token was removed and the provider kept
  reporting an authenticated session.
- **`AuthProvider` follows `token` events.** As a consequence of the above, on
  the web a login or logout in one browser tab now updates `useAuth()` in the
  other tabs of the same origin (the browser relays the `token` storage change).
- **A 401 from the login request is no longer treated as an expired session.**
  A rejected login (`/auth/login` or `/{routeGroup}/auth/login`) does not call
  `onUnauthorized`, does not redirect and leaves storage alone; `login()`
  reports it as `{ success: false, status: 401 }` as before.
- **`useRegister` starts a session.** When the response carries a token it is
  stored (with the user and organization) before the mutation resolves and
  `AuthProvider` becomes authenticated, matching `login()`. Previously the
  token was only returned. `useAcceptInvitation` is unchanged: it issues no
  token.

### Fixed

- **`useNestedOperations` posts to `/{organization}/nested`**, the endpoint the
  Laravel, Rails and NestJS servers register by default. It used to post to
  `/{organization}/nested-operations`, which no default server serves (404).
  If your server sets `nested.path` to `nested-operations` to match the old
  client, pass `configureApi({ nestedPath: 'nested-operations' })`.
- `useOwner`, `useUserRole` and `useOrganizationExists` read the
  `{ data: [...] }` envelope Rhino servers answer with. They used to expect a
  bare array, so against a current server `useOwner().data` was the envelope
  itself and `useUserRole().hasRole()` was always `false`.
- `login()` stores `route_group` when the group was set through
  `configureApi({ routeGroup })`. It used to store it only for a group passed
  to `AuthProvider` or to the call itself, leaving `useRouteGroup()` at `null`.
- `login()` now emits the `organization_slug` event, so data hooks that were
  already mounted pick up the organization instead of staying idle until they
  remount.
- The token is in storage when `login()` resolves. It used to be written by an
  effect after the next render, so a request issued right after
  `await login()` went out without an `Authorization` header.
- React Native: `initStorage()` hydrates `route_group`, so `useRouteGroup()`
  survives an app restart. The hydrated keys now come from `STORAGE_KEYS`.
- The default 401 handler no longer throws where `window` exists without a
  `location` (React Native with no `onUnauthorized` configured).

## [4.6.0] - 2026-09-15

### Added

- **Computed attributes can carry arguments.** `computedAttributes` (on
  `useModelIndex` / `useModelShow` / `useModelTrashed`) and `attributes` (on
  `useModelComputedAttributes`) now take an object as well as a list, mirroring
  the 4.5.0 scope-arguments shape: `{ ticketsSince: '2026-01-01' }` serializes to
  `?computed_attributes[ticketsSince]=2026-01-01`, and
  `{ revenue: { from: 'a', to: 'b' }, activeUsersCount: null }` to
  `?attributes[revenue][from]=a&attributes[revenue][to]=b&attributes[activeUsersCount]=`.
  A no-argument entry keeps its trailing `=`, which the server requires. The list
  form (`['a', 'b']` → `?computed_attributes=a,b`) is byte-for-byte unchanged.
  Exported as the new `ComputedAttributeSelection` type.

### Fixed

- `ScopeSelection` is now actually exported from the package entry (4.5.0
  documented it but only exported it from the types module).

## [4.5.0] - 2026-09-11

### Added

- **Named scopes can carry arguments.** The `scope` option now takes an object as
  well as a name: `{ since: '2026-01-01' }` serializes to `?scope[since]=2026-01-01`,
  and `{ window: { from: 'a', to: 'b' } }` to
  `?scope[window][from]=a&scope[window][to]=b`. Up to three scopes may be combined
  in one request, applied in key order; write a no-argument scope as
  `{ archived: null }` when combining it with one that takes arguments. The string
  form (`scope: 'archived'`) is unchanged, and the two forms cannot be mixed in a
  single request because they share the `scope` query key. Exported as the new
  `ScopeSelection` type.

### Changed

- Filtering or sorting by an attribute the server's policy hides from the current
  user now returns **403** (server-side change in Rhino 4.8.0). A column the model
  never allowlisted is still ignored silently, as before.

## [4.2.0] - 2026-06-07

### Added

- **Electron desktop support (no separate package).** New subpath modules:
  `@rhino-dev/rhino-react/electron` (`registerRhinoSecureStorage`, `createSecureStore`
  — `safeStorage`-backed encrypted store + IPC handlers for the main process),
  `@rhino-dev/rhino-react/electron/preload` (`exposeRhinoStorage`), and
  `@rhino-dev/rhino-react/electron/renderer` (`createElectronStorage`,
  `initElectronStorage` — a synchronous, IPC-backed adapter). Electron primitives
  are injected, so the library has no `electron` dependency.
- **Injectable storage.** `configureApi({ storage })` now accepts any
  `{ getItem, setItem, removeItem }` adapter, and `setStorageAdapter()` /
  `getStorageAdapter()` are exported. The default remains localStorage (web) /
  AsyncStorage (React Native) — fully backward compatible.

- **Subdomain/host-based org routing for the data hooks.** New `tenancy` option on
  `configureApi({ tenancy: 'path' | 'subdomain' })` (also accepted on
  `<AuthProvider tenancy="subdomain">`). Default `'path'` is byte-for-byte the
  previous behavior (`/api/{org}/{model}`). With `'subdomain'`, the org is carried
  by the request host (e.g. `{org}.example.com`) and the data hooks build
  `/api/{model}` with **no** org segment, for every CRUD/trashed/restore/force-delete/
  audit/nested-operations path. New `getTenancy()` export and `TenancyMode` type.

## [1.0.0] - 2024-XX-XX

### Added

#### Core CRUD Hooks
- `useModelIndex()` - Fetch paginated model lists with filtering, sorting, and search
- `useModelShow()` - Fetch single model by ID with relationships
- `useModelStore()` - Create new model instances
- `useModelUpdate()` - Update existing models
- `useModelDelete()` - Soft delete models (moves to trash)

#### Soft Delete Operations
- `useModelTrashed()` - Fetch soft-deleted models with pagination
- `useModelRestore()` - Restore soft-deleted models
- `useModelForceDelete()` - Permanently delete models (cannot be recovered)

#### Advanced Features
- `useNestedOperations()` - Execute multi-model transactions with reference support
- `useModelAudit()` - Fetch audit trail for model instances

#### Authentication & Organization
- `useAuth()` - Authentication state and methods (login, logout, setOrganization)
- `useOrganization()` - Get current organization slug from context
- `useOwner()` - Fetch organization data with related users
- `useOrganizationExists()` - Validate organization existence

#### Invitations System
- `useInvitations()` - List organization invitations with status filtering
- `useInviteUser()` - Create new invitation
- `useResendInvitation()` - Resend invitation email
- `useCancelInvitation()` - Cancel pending invitation
- `useAcceptInvitation()` - Accept invitation (public route)

#### Query Features
- **Pagination** - Automatic metadata extraction from response headers (X-Current-Page, X-Last-Page, X-Per-Page, X-Total)
- **Filtering** - Field-level filters with `filter[field]=value` syntax
- **Search** - Full-text search across models
- **Relationships** - Eager loading with `includes` parameter
- **Field Selection** - Select specific fields to reduce payload size
- **Sorting** - Sort by any field (ascending/descending with `-` prefix)
- **Multi-tenant Routing** - Organization-based URL routing

#### Utilities
- `extractPaginationFromHeaders()` - Parse pagination metadata from API responses
- Configured Axios client with:
  - Base URL configuration via environment variables
  - Bearer token injection from localStorage
  - CORS support with credentials
  - 401 auto-logout and redirect
  - Request/response interceptors

#### Infrastructure
- **TanStack Query 5.62.11** - Data fetching, caching, and state management
- **React 19 support** - Compatible with latest React features
- **TypeScript support** - Full type definitions and IntelliSense
- **Barrel exports** - Clean import paths from `@rhino-dev/rhino-react`
- **Comprehensive documentation** - API reference, guides, and examples
- **Example components** - Demo components for testing features

### Changed
- `useModelIndex` now returns `{ data, pagination }` instead of just `data` for consistency
- All hooks use organization context from `useOrganization()` for multi-tenancy
- React Query cache keys include organization and options for proper isolation

### Infrastructure
- Built with Vite 6.0.1 for fast development and optimized builds
- ESLint 9 with React and React Hooks plugins
- Tailwind CSS 3.4.0 with dark mode support
- Radix UI components for accessible UI primitives

## [Unreleased]

### Planned Features
- **WebSocket Support** - Real-time updates for model changes
- **Offline Mode** - Queue operations and sync when online
- **Advanced Caching** - Configurable cache strategies per model
- **Optimistic Updates** - Helpers for optimistic UI updates
- **File Uploads** - Dedicated hooks for file upload with progress
- **Batch Operations** - Bulk create, update, delete operations
- **Query Builder UI** - Visual query builder component
- **Subscriptions** - Model subscription for live updates

### Planned Improvements
- **Performance** - Virtual scrolling for large lists
- **DevTools** - React Query DevTools integration
- **Testing** - Jest/Vitest setup with testing utilities
- **Storybook** - Component documentation and testing
- **CI/CD** - Automated testing and npm publishing

---

## Version History

- **1.0.0** - Initial release with complete CRUD, soft deletes, nested operations, pagination, and multi-tenant support

---

## Migration Guides

### Upgrading to 1.0.0

If you were using the template/demo version, you'll need to update imports:

**Before:**
```typescript
import { useModelIndex } from './hooks/useModel';
```

**After:**
```typescript
import { useModelIndex } from '@rhino-dev/rhino-react';
```

**Breaking Changes:**
- `useModelIndex` now returns `{ data, pagination }` instead of direct array
  - Update: `const users = useModelIndex('users')` → `const { data: response } = useModelIndex('users'); const users = response?.data || [];`

---

## Support

- [Documentation](./docs/)
- [Issues](https://github.com/yourusername/rhino-client/issues)
- [Discussions](https://github.com/yourusername/rhino-client/discussions)
