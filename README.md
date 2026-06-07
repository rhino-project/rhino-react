# @rhino-dev/rhino-react

> A comprehensive React & React Native library for Rhino backend applications with full CRUD, pagination, soft deletes, multi-tenant support, and TypeScript generics.

[![npm version](https://badge.fury.io/js/@rhino-project%2Frhino-react.svg)](https://www.npmjs.com/package/@rhino-dev/rhino-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🔐 **Authentication** - Built-in auth hooks with token-based authentication
- 🚪 **Group-aware auth** - Optional route groups for per-group auth endpoints, membership (403) handling, register & password recovery/reset hooks
- 🏢 **Multi-tenancy** - Organization-based routing and data scoping
- 📊 **Complete CRUD** - Index, show, create, update, delete operations
- 🗑️ **Soft Deletes** - Trash, restore, and force delete support
- 🔍 **Advanced Querying** - Search, filters, sorting, field selection, pagination
- 🔗 **Relationships** - Eager loading with includes
- 🔄 **Nested Operations** - Multi-model transactions
- 📝 **Audit Trails** - Track changes and history
- ⚡ **React Query** - Built on TanStack Query for caching and state management
- 📘 **TypeScript Generics** - Full type safety with `useModelIndex<Post>()` for typed responses and mutations
- 📱 **Cross-Platform** - Single codebase for React (web) and React Native with pluggable storage/events adapters
- 🔔 **Toast Notifications** - Built-in `useToast` hook with reducer-based state management

---

## 📦 Installation

```bash
npm install @rhino-dev/rhino-react
# or
yarn add @rhino-dev/rhino-react
# or
pnpm add @rhino-dev/rhino-react
```

---

## 🚀 Quick Start

```tsx
import { useModelIndex, useModelStore } from '@rhino-dev/rhino-react';
import type { Post } from './types/rhino'; // Auto-generated types

function PostsList() {
  // Fetch posts with pagination — fully typed
  const { data: response, isLoading } = useModelIndex<Post>('posts', {
    page: 1,
    perPage: 20,
    search: 'react',
    includes: ['author'],
    sort: '-created_at'
  });

  const posts = response?.data || [];
  const pagination = response?.pagination;

  // Create new post — typed input
  const createPost = useModelStore<Post>('posts');

  const handleCreate = () => {
    createPost.mutate({
      title: 'My Post',
      content: 'Post content'
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Post</button>

      {posts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          {post.author && <p>By: {post.author.name}</p>}
        </div>
      ))}

      {pagination && (
        <div>
          Page {pagination.currentPage} of {pagination.lastPage}
        </div>
      )}
    </div>
  );
}
```

---

## 📚 Documentation

For full documentation, guides, and API reference visit:

**[https://rhino-project.github.io/rhino-docs/docs/getting-started](https://rhino-project.github.io/rhino-docs/docs/getting-started)**

---

## 🎯 Core Hooks

### CRUD Operations

| Hook | Purpose |
|------|---------|
| `useModelIndex<T>` | Fetch list of models with pagination, filtering, search |
| `useModelShow<T>` | Fetch single model by ID |
| `useModelStore<T>` | Create new model |
| `useModelUpdate<T>` | Update existing model |
| `useModelDelete<T>` | Soft delete model |

### Soft Deletes

| Hook | Purpose |
|------|---------|
| `useModelTrashed<T>` | Fetch soft-deleted models |
| `useModelRestore<T>` | Restore soft-deleted model |
| `useModelForceDelete<T>` | Permanently delete model |

### Advanced Features

| Hook | Purpose |
|------|---------|
| `useNestedOperations` | Multi-model transactions |
| `useModelAudit` | Fetch audit trail for a model |

### Authentication & Organization

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state and methods (`login`/`logout` accept an optional `{ routeGroup }`) |
| `useOrganization` | Current organization slug |
| `useOwner` | Organization data |
| `useOrganizationExists` | Validate organization |
| `useUserRole` | Current user role and `hasRole()` helper |
| `useRouteGroup` | Current route group (group-aware auth), with cross-tab/native sync |
| `useRegister` | Register a user (typically via invitation token), respects the route group |
| `usePasswordRecover` | Request a password recovery email, respects the route group |
| `useResetPassword` | Reset a password with a reset token, respects the route group |

### Invitations

| Hook | Purpose |
|------|---------|
| `useInvitations` | List invitations |
| `useInviteUser` | Create invitation (optional `route_group` in payload) |
| `useResendInvitation` | Resend invitation |
| `useCancelInvitation` | Cancel invitation |
| `useAcceptInvitation` | Accept invitation (accepts a token string or `{ token, route_group }`) |

### Utilities

| Hook | Purpose |
|------|---------|
| `useToast` | Toast notifications with multi-instance sync |
| `useModelQuery` | Deprecated alias for `useModelIndex` |

---

## 🚪 Group-Aware Auth

Rhino backends can register the auth route set per **route group**. A prefix-based
group exposes its auth under `/api/{group}/auth/*`; a domain-based group serves the
plain `/api/auth/*` on its own host (so domain-based groups need **no** client change).

This support is fully opt-in and backward compatible — with no `routeGroup`
configured, every auth/invitation URL is byte-for-byte what it was before.

```tsx
import { configureApi, AuthProvider } from '@rhino-dev/rhino-react';

// Option A — configure the API client once at startup
configureApi({
  baseURL: '/api',
  routeGroup: 'driver',            // auth URLs become /driver/auth/*
  onForbidden: (error) => {        // 403 = authenticated but not a group member
    // The token is NOT cleared on 403 (unlike 401). Surface membership denial:
    console.warn(error.response?.data?.message);
  },
});

// Option B — pass it to the provider (registers it with the API client)
<AuthProvider routeGroup="driver">{children}</AuthProvider>;
```

`login`/`logout` accept a per-call override, and the resolved group is persisted
under the `route_group` storage key and exposed via `useRouteGroup()`:

```tsx
const { login, logout } = useAuth();
await login(email, password, { routeGroup: 'admin' }); // POST /admin/auth/login

const routeGroup = useRouteGroup(); // 'admin' after a group-aware login

await logout(); // clears the persisted route group
```

The group-aware action hooks respect the configured group (with an optional
per-call `routeGroup`):

```tsx
const register = useRegister();
await register.mutateAsync({ token, name, email, password, password_confirmation });

const recover = usePasswordRecover();
await recover.mutateAsync({ email });

const reset = useResetPassword();
await reset.mutateAsync({ token, email, password, password_confirmation });
```

Invitations can carry the group too:

```tsx
useInviteUser().mutate({ email, role_id, route_group: 'driver' });
useAcceptInvitation().mutate({ token, route_group: 'driver' });
```

---

## 🏢 Multitenancy: path vs. subdomain

The data hooks (`useModelIndex`, `useModelShow`, `useModelStore`, `useModelUpdate`,
`useModelDelete`, `useModelTrashed`, `useModelRestore`, `useModelForceDelete`,
`useModelAudit`, `useNestedOperations`) scope requests to the current organization.
**How** the org is conveyed is controlled by the `tenancy` option:

| `tenancy` | Org carried by | Example URL | When to use |
|-----------|----------------|-------------|-------------|
| `'path'` (default) | URL path segment | `/api/{org}/{model}` | Path-prefix multitenancy (e.g. `example.com/{org}/...`) |
| `'subdomain'` | Request **host** | `/api/{model}` | Domain/subdomain route groups (e.g. `{org}.example.com`) |

The default is `'path'` — byte-for-byte the historical behavior. With
`tenancy: 'subdomain'`, the org is conveyed by the host (the browser is already on
`{org}.example.com`), so the hooks build `/api/{model}` with **no org segment**. The
org is still tracked in context (`useOrganization`) for display/filtering and the hooks
stay guarded by it (they're disabled / throw when no org is set) — it just isn't
prepended to the path. This replaces the old workaround of avoiding `setOrganization`
and hand-rolling a path helper.

```tsx
import { configureApi, AuthProvider } from '@rhino-dev/rhino-react';

// Option A — configure the API client once at startup
configureApi({ baseURL: '/api', tenancy: 'subdomain' });

// Option B — pass it to the provider (registers it with the API client)
<AuthProvider tenancy="subdomain">{children}</AuthProvider>;

// useModelIndex('posts') now hits  GET /api/posts        (not /api/{org}/posts)
// useModelShow('posts', 1)         GET /api/posts/1
// useModelStore('posts').mutate()  POST /api/posts
```

`getTenancy()` returns the active mode (`'path'` | `'subdomain'`) if you need it directly.

---

## 🖥️ Desktop (Electron)

The same hooks run in an **Electron** renderer (it's Chromium) — no separate
package needed. For desktop you typically want the auth token stored **encrypted
at rest** via Electron `safeStorage` (the OS keychain) in the main process,
instead of renderer `localStorage`. Three subpath modules provide that:

```ts
// main process — encrypted store + IPC handlers
import { registerRhinoSecureStorage } from '@rhino-dev/rhino-react/electron';
registerRhinoSecureStorage({ ipcMain, safeStorage, app, fs, path });

// preload — exposes window.rhino.storage
import { exposeRhinoStorage } from '@rhino-dev/rhino-react/electron/preload';
exposeRhinoStorage({ contextBridge, ipcRenderer });

// renderer — hydrate once, then use as the storage adapter
import { createElectronStorage, initElectronStorage } from '@rhino-dev/rhino-react/electron/renderer';
await initElectronStorage();
configureApi({ baseURL: '/api', storage: createElectronStorage() });
```

`configureApi({ storage })` accepts any `{ getItem, setItem, removeItem }` adapter,
so you can also plug in a custom vault (or call `setStorageAdapter()` directly).
See the **Desktop (Electron)** docs page and the `client-desktop` example.

---

## 🏗️ Architecture

Built with modern technologies:

- **React 18/19** - Supports both React 18 and 19
- **React Native** - Cross-platform with pluggable storage and events adapters
- **TanStack Query 5** - Powerful data fetching and caching
- **Axios** - HTTP client with interceptors
- **TypeScript** - Full type safety with generics on all hooks

### Design Principles

- **Composable** - Small, focused hooks that work together
- **Type-Safe** - TypeScript generics (`useModelIndex<Post>()`) with auto-generated types
- **Cached** - Automatic caching and background refetching via React Query
- **Cross-Platform** - Same hooks on web and React Native
- **Backend-Agnostic** - Works with any Rhino server (Laravel, Rails, NestJS, or AdonisJS)

---

## 💡 Key Features

### Pagination

Automatic pagination metadata extraction from response headers:

```tsx
const { data: response } = useModelIndex('posts', {
  page: 2,
  perPage: 20
});

const posts = response?.data || [];
const pagination = response?.pagination;
// { currentPage: 2, lastPage: 10, perPage: 20, total: 195 }
```

### Filtering & Search

Powerful query building with filters and full-text search:

```tsx
const { data: response } = useModelIndex('posts', {
  search: 'react hooks',
  filters: {
    status: 'published',
    category: 'tech'
  },
  sort: '-created_at'
});
```

### Relationships

Eager load related data with includes:

```tsx
const { data: post } = useModelShow('posts', 123, {
  includes: ['author', 'comments', 'tags']
});
```

### Soft Deletes

Complete soft delete workflow:

```tsx
const deletePost = useModelDelete('posts');
const trashedPosts = useModelTrashed('posts');
const restore = useModelRestore('posts');
const forceDelete = useModelForceDelete('posts');

// Soft delete
deletePost.mutate(postId);

// Restore
restore.mutate(postId);

// Permanently delete
forceDelete.mutate(postId);
```

### Nested Operations

Execute multiple operations in a single transaction:

```tsx
const nestedOps = useNestedOperations();

nestedOps.mutate({
  operations: [
    {
      action: 'create',
      model: 'blogs',
      data: { title: 'My Blog' }
    },
    {
      action: 'create',
      model: 'posts',
      data: {
        title: 'First Post',
        blog_id: '$0.id' // Reference first operation's result
      }
    }
  ]
});
```

---

## 🔧 Requirements

- **React:** 18.0.0 or higher (supports React 19)
- **Node.js:** 18.0.0 or higher
- **Backend:** Any Rhino server ([Laravel](https://github.com/rhino-project/rhino-laravel), [Rails](https://github.com/rhino-project/rhino-rails), [NestJS](https://github.com/rhino-project/rhino-nestjs), or [AdonisJS](https://github.com/rhino-project/rhino-adonisjs))

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/rhino-project/rhino-react.git
cd rhino-client

# Install dependencies
npm install

# Build library
npm run build

# Run tests
npm test
```

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- [Documentation](https://rhino-project.github.io/rhino-docs/docs/getting-started)
- [Changelog](./CHANGELOG.md)
- [Issues](https://github.com/rhino-project/rhino-react/issues)
- [npm Package](https://www.npmjs.com/package/@rhino-dev/rhino-react)
