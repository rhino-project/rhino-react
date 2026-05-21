# Tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/__tests__/storage.test.js
```

## Test Environment

- **Runner**: Vitest
- **DOM**: jsdom (simulates browser APIs for React hooks and localStorage)
- **React Testing**: @testing-library/react (renderHook, act, waitFor)
- **Setup**: `src/__tests__/setup.js` loads `@testing-library/jest-dom` matchers

---

## Platform Adapter Tests

### `storage.test.js`

Tests for the web storage adapter (`src/lib/storage.js`) that wraps `localStorage`. The React Native variant (`storage.native.js`) wraps `@react-native-async-storage/async-storage` with an in-memory cache.

| Test | What it verifies |
|------|--------------------|
| `should export a default storage instance` | `storage` exports `getItem`, `setItem`, `removeItem` functions |
| `should return null for non-existent keys` | Reading a key that was never set returns `null` |
| `should store and retrieve values` | `setItem` + `getItem` round-trips correctly |
| `should remove values` | `removeItem` clears a previously stored key |
| `should overwrite existing values` | Calling `setItem` twice overwrites the first value |
| `createWebStorage should return independent instances backed by localStorage` | Multiple instances share the same underlying `localStorage` |

---

### `events.test.js`

Tests for the web events adapter (`src/lib/events.js`) that wraps `window` StorageEvent for cross-tab synchronization.

| Test | What it verifies |
|------|--------------------|
| `should export a default events instance` | `events` exports `emit` and `subscribe` functions |
| `should notify subscribers when emitting events` | `emit` triggers the subscribed callback with the correct value |
| `should not notify subscribers for different keys` | Emitting on key A does not trigger subscribers of key B |
| `should stop notifying after unsubscribe` | The unsubscribe function returned by `subscribe` stops future notifications |
| `should support multiple subscribers for the same key` | Multiple callbacks on the same key all receive the emitted value |
| `should handle null values in emit` | Emitting `null` correctly passes `null` to subscribers |
| `createWebEvents should create independent instances` | Multiple web event instances share the same `window` event bus |

---

### `events.native.test.js`

Tests for the React Native events adapter (`src/lib/events.native.js`) that uses an in-memory listener registry instead of `window` events.

| Test | What it verifies |
|------|--------------------|
| `should notify subscribers when emitting events` | `emit` triggers the subscribed callback with the correct value |
| `should not notify subscribers for different keys` | Emitting on key A does not trigger subscribers of key B |
| `should stop notifying after unsubscribe` | The unsubscribe function stops future notifications |
| `should support multiple subscribers for the same key` | Multiple callbacks on the same key all receive the emitted value |
| `should handle null values in emit` | Emitting `null` correctly passes `null` to subscribers |
| `should clean up empty listener sets` | After unsubscribe, emitting does not throw and callback is not called |

---

## Utility Tests

### `pagination.test.js`

Tests for `extractPaginationFromHeaders` (`src/lib/pagination.js`) which extracts pagination metadata from Laravel response headers.

| Test | What it verifies |
|------|--------------------|
| `should return null when no pagination headers are present` | Empty headers object returns `null` |
| `should return null when all pagination headers are undefined` | All undefined header values return `null` |
| `should extract all pagination values from valid headers` | Parses `x-current-page`, `x-last-page`, `x-per-page`, `x-total` as integers |
| `should use default values when headers contain non-numeric strings` | NaN fallback defaults: currentPage=1, lastPage=1, perPage=15, total=0 |
| `should handle partial headers with fallback defaults` | Missing headers use defaults while present headers parse correctly |
| `should parse string 0 for total correctly` | `parseInt('0')` returns 0, not the default |
| `should return non-null when at least one header exists` | A single header triggers object return with remaining defaults |

---

### `utils.test.js`

Tests for the `cn` class name utility (`src/lib/utils.js`) that wraps `clsx` + `tailwind-merge`.

| Test | What it verifies |
|------|--------------------|
| `should return empty string for no arguments` | `cn()` returns `''` |
| `should merge class names` | Multiple string inputs are combined |
| `should handle conditional class objects` | `{ active: true, disabled: false }` includes only truthy keys |
| `should resolve tailwind conflicts with last-wins` | `cn('px-2', 'px-4')` keeps `px-4`, removes `px-2` |

---

### `cogent.test.js`

Tests for the cogent-js dynamic import wrapper (`src/lib/cogent.js`) that lazy-loads the query builder.

| Test | What it verifies |
|------|--------------------|
| `loadCogent should resolve after dynamic import` | Async loading path completes successfully |
| `loadCogent should return when already loaded` | Cached path returns immediately on subsequent calls |
| `Query should create a new instance after module loads` | `Query()` returns a new instance after `loadCogent()` |
| `Query should pass arguments to the constructor` | Constructor arguments are forwarded to the underlying class |
| `exports Query and loadCogent` | Module exports both functions |
| `Query should throw if QueryClass is not loaded` | MockQueryClass exists and is callable |

---

## Hook Tests

### `useOrganization.test.js`

Tests for the `useOrganization` hook and `setOrganization` function (`src/hooks/useOrganization.js`). The hook reads the current organization slug from storage and subscribes to changes via the events adapter.

| Test | What it verifies |
|------|--------------------|
| `should return null when no organization is stored` | Hook returns `null` when storage is empty |
| `should return stored organization slug` | Hook reads existing `organization_slug` from storage on mount |
| `should update when setOrganization is called` | Calling `setOrganization('new-org')` updates the hook's return value reactively |
| `should clear when setOrganization is called with null` | Calling `setOrganization(null)` clears the value to `null` |
| `setOrganization should persist to storage` | The standalone `setOrganization` function writes to storage |
| `setOrganization should remove from storage when null` | Passing `null` removes the key from storage |

---

### `useModel.test.js`

Tests for all CRUD, soft-delete, nested operation, and audit hooks (`src/hooks/useModel.js`). Mocks axios, useOrganization, and pagination. Uses QueryClientProvider wrapper.

#### useModelIndex (7 tests)

| Test | What it verifies |
|------|--------------------|
| `should return error state when organization is null` | Returns error with `'Organization slug is required'` |
| `should call api.get with correct base URL` | Fetches `/my-org/users` |
| `should build URL with filters` | Appends `filter[status]=published&filter[author]=john` |
| `should build URL with includes, sort, fields, search, page, perPage` | All query params appear in URL |
| `should return data and pagination from response` | Combines `response.data` with extracted pagination |
| `should handle per_page as alias for perPage` | Both naming conventions produce `per_page=` in URL |
| `should not call api when organization is null` | `api.get` is never called |

#### useModelShow (6 tests)

| Test | What it verifies |
|------|--------------------|
| `should return error when organization is null` | Error with `'Organization slug is required'` |
| `should return error when id is null` | Error with `'ID is required for useModelShow'` |
| `should call api.get with correct URL` | Fetches `/my-org/users/42` |
| `should build URL with includes and filters` | Query params appended to resource URL |
| `should return response data directly` | Returns `response.data` (not wrapped in `{ data, pagination }`) |
| `should not call api when id is falsy` | Query is disabled when id is null |

#### useModelStore (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should POST to correct URL with data` | `api.post('/my-org/users', data)` |
| `should return response data on success` | Returns unwrapped `response.data` |
| `should invalidate modelIndex and modelShow on success` | Both query keys invalidated |

#### useModelUpdate (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should PUT to correct URL with id and data` | `api.put('/my-org/users/42', data)` |
| `should return response data on success` | Returns unwrapped `response.data` |
| `should invalidate modelIndex and modelShow on success` | Both query keys invalidated |

#### useModelDelete (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should DELETE correct URL with id` | `api.delete('/my-org/users/42')` |
| `should invalidate modelIndex and modelShow on success` | Both query keys invalidated |

#### useModelTrashed (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should return error when organization is null` | Error with `'Organization slug is required'` |
| `should GET /org/model/trashed` | Fetches `/my-org/users/trashed` |
| `should build URL with query options` | Filters, sort, page, perPage appended |
| `should return data and pagination` | Combines data with extracted pagination |

#### useModelRestore (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should POST to /org/model/id/restore` | `api.post('/my-org/users/42/restore')` |
| `should invalidate modelIndex, modelTrashed, and modelShow` | All three query keys invalidated |

#### useModelForceDelete (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should DELETE /org/model/id/force-delete` | `api.delete('/my-org/users/42/force-delete')` |
| `should only invalidate modelTrashed` | Only trashed queries invalidated (not index or show) |

#### useNestedOperations (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should POST to /org/nested-operations` | `api.post('/my-org/nested-operations', { operations })` |
| `should invalidate all affected models deduped` | Uses `Set` to deduplicate models, invalidates index+show for each |

#### useModelAudit (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should return error when organization is null` | Error with `'Organization slug is required'` |
| `should return error when id is null` | Error with `'ID is required for useModelAudit'` |
| `should GET /org/model/id/audit` | Fetches `/my-org/users/42/audit` |
| `should build URL with page and perPage` | Pagination params appended |

---

### `useInvitations.test.js`

Tests for all invitation hooks (`src/hooks/useInvitations.js`). Mocks axios and useOrganization. Uses QueryClientProvider wrapper.

#### useInvitations (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should return error when organization is null` | Error with `'Organization slug is required'` |
| `should GET /org/invitations when status is all` | No `?status=` param for default 'all' |
| `should GET with status param when filtered` | `?status=pending` appended |
| `should not call api when organization is null` | Query is disabled |

#### useInviteUser (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should POST to /org/invitations` | `api.post` with `{ email, role_id }` |
| `should invalidate invitations queries` | Query key `['invitations', org]` invalidated |

#### useResendInvitation (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should POST to /org/invitations/id/resend` | Correct resend endpoint |
| `should invalidate invitations queries` | Invitations invalidated |

#### useCancelInvitation (3 tests)

| Test | What it verifies |
|------|--------------------|
| `should throw when organization is null` | Throws `'Organization slug is required'` |
| `should DELETE /org/invitations/id` | `api.delete` on invitation |
| `should invalidate invitations queries` | Invitations invalidated |

#### useAcceptInvitation (2 tests)

| Test | What it verifies |
|------|--------------------|
| `should POST to /invitations/accept with token` | Public route — no org prefix in URL |
| `should invalidate modelIndex users queries` | User list refreshed after accepting |

---

### `use-toast.test.js`

Tests for the toast notification system (`src/hooks/use-toast.js`). Tests the exported reducer, toast function, and useToast hook. Uses `vi.resetModules()` for clean state between runs and `vi.useFakeTimers()` for removal delay testing.

#### reducer (6 tests)

| Test | What it verifies |
|------|--------------------|
| `ADD_TOAST should add a toast to the beginning` | New toast prepended to array |
| `ADD_TOAST should enforce TOAST_LIMIT of 1` | Array sliced to max 1 toast |
| `UPDATE_TOAST should merge props into matching toast` | Props merged by id, other fields preserved |
| `UPDATE_TOAST should not modify non-matching toasts` | Only the targeted toast is updated |
| `DISMISS_TOAST should set open to false` | Matching toast gets `open: false` |
| `REMOVE_TOAST should remove matching toast` | Toast filtered out by id |

#### toast function (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should return id, dismiss, and update functions` | Return shape is `{ id, dismiss, update }` |
| `should generate unique incrementing IDs` | Each call returns a different id |
| `dismiss should set the toast to open false` | `onOpenChange(false)` triggers dismiss |
| `update should merge new props` | Title can be changed via returned `update` function |

#### useToast hook (4 tests)

| Test | What it verifies |
|------|--------------------|
| `should return toasts array and functions` | `{ toasts, toast, dismiss }` shape |
| `should update when a toast is added` | Hook re-renders with new toast |
| `should remove toast after TOAST_REMOVE_DELAY` | Timer-based removal after 1000000ms |
| `should clean up listener on unmount` | No errors after hook unmounts |

---

### `useOwner.test.js`

Tests for the `useOwner` hook (`src/hooks/useOwner.js`) that fetches organization data with slug matching logic.

| Test | What it verifies |
|------|--------------------|
| `should return disabled state when no slug` | `data: null, isLoading: false, error: null` |
| `should fall back to useOrganization slug` | Uses hook's slug when no param provided |
| `should use explicit slug over useOrganization` | Param takes priority over hook value |
| `should find matching org from array response` | `.find(o => o.slug === slug)` selects correct org |
| `should return first element when no match` | Falls back to `data[0]` |
| `should return null for empty array` | `[]` response returns `null` |
| `should return object directly when not array` | Single object passthrough |
| `should not call api when no slug available` | Query disabled, no API call |

---

### `useUserRole.test.js`

Tests for the `useUserRole` hook (`src/hooks/useUserRole.js`) that resolves the current user's roles in the current organization and provides a `hasRole()` helper. Mocks axios, useOrganization, and useOwner. Uses QueryClientProvider wrapper.

#### Core behavior (8 tests)

| Test | What it verifies |
|------|--------------------|
| `should return empty roles when no organization data` | Returns `roles: [], roleIds: []` when org data is null |
| `should return empty roles when no user in storage` | No match when localStorage has no user |
| `should resolve a single role for the current user` | Matches user by id, resolves `pivot.role_id` to full role object |
| `should resolve multiple roles for the current user` | User appearing multiple times in users list (one per role) resolves all roles |
| `should not include roles from other users` | Only roles for the current user's id are returned |
| `should fetch roles from the correct API endpoint` | Calls `GET /{org}/roles` |
| `should not fetch roles when organization slug is null` | Query disabled, no API call |
| `should report isLoading when org is loading` | `isLoading: true` when useOwner is loading |

#### hasRole (6 tests)

| Test | What it verifies |
|------|--------------------|
| `should return true when user has the role by name` | Matches against `role.name` |
| `should return true when user has the role by slug` | Matches against `role.slug` |
| `should be case-insensitive` | `'ADMIN'`, `'aDmIn'` both match |
| `should return false when user does not have the role` | Non-matching role returns `false` |
| `should return false when roles are not loaded yet` | Returns `false` while loading |
| `should match any role when user has multiple roles` | `hasRole('admin')` and `hasRole('assistant')` both return `true` |

---

### `useOrganizationExists.test.js`

Tests for the `useOrganizationExists` hook (`src/hooks/useOrganizationExists.js`) that wraps `useOwner` to provide a boolean existence check.

| Test | What it verifies |
|------|--------------------|
| `should return exists false when data is null` | `exists: false, data: false` |
| `should return exists true when org data present` | `exists: true, organization: {...}` |
| `should forward isLoading from useOwner` | Loading state passed through |
| `should forward error from useOwner` | Error passed through |
| `should return data as boolean true not object` | `data` field is `true`, not the org object |

---

## Context Tests

### `AuthContext.test.js`

Tests for the `AuthProvider` context and `useAuth` hook (`src/context/AuthContext.jsx`). The provider manages authentication state (token, login, logout) and organization selection, persisted via the storage adapter.

| Test | What it verifies |
|------|--------------------|
| `should start unauthenticated when no token stored` | `isAuthenticated` is `false` and `token` is `null` on fresh mount |
| `should start authenticated when token exists in storage` | `isAuthenticated` is `true` and `token` matches when storage has a token |
| `should expose login, logout, setOrganization methods` | The context value exposes all three methods as functions |
| `should throw when useAuth is used outside AuthProvider` | Calling `useAuth` without a wrapping `AuthProvider` throws a descriptive error |
| `setOrganization should store slug in storage` | `setOrganization('my-org')` persists to both `organization_slug` and `last_organization` keys |
| `setOrganization with null should clear storage` | `setOrganization(null)` removes both organization keys from storage |

---

## API Client Tests

### `axios.test.js`

Tests for the pre-configured axios instance and `configureApi` function (`src/lib/axios.js`). The client auto-attaches Bearer tokens from storage and supports a configurable `onUnauthorized` callback for 401 responses.

| Test | What it verifies |
|------|--------------------|
| `should have default baseURL` | The axios instance has a defined default `baseURL` |
| `should update baseURL via configureApi` | `configureApi({ baseURL })` updates the instance's base URL |
| `should attach Authorization header from storage` | Request interceptor reads token from storage and sets `Authorization: Bearer {token}` |
| `should not attach Authorization when no token in storage` | No `Authorization` header is set when storage has no token |
| `should accept onUnauthorized callback via configureApi` | `configureApi({ onUnauthorized })` accepts a callback without error |

---

## Test Summary

| Category | File | Tests |
|----------|------|:-----:|
| Platform Adapters | `storage.test.js` | 6 |
| Platform Adapters | `events.test.js` | 7 |
| Platform Adapters | `events.native.test.js` | 6 |
| Utilities | `pagination.test.js` | 7 |
| Utilities | `utils.test.js` | 4 |
| Utilities | `cogent.test.js` | 6 |
| Hooks | `useOrganization.test.js` | 6 |
| Hooks | `useModel.test.js` | 41 |
| Hooks | `useInvitations.test.js` | 15 |
| Hooks | `use-toast.test.js` | 14 |
| Hooks | `useOwner.test.js` | 8 |
| Hooks | `useUserRole.test.js` | 14 |
| Hooks | `useOrganizationExists.test.js` | 5 |
| Context | `AuthContext.test.js` | 6 |
| API Client | `axios.test.js` | 5 |
| | **Total** | **150** |
