# @rhino-dev/rhino-react

> A comprehensive React & React Native library for Rhino backend applications with full CRUD, pagination, soft deletes, multi-tenant support, and TypeScript generics.

[![npm version](https://badge.fury.io/js/@rhino-project%2Frhino-react.svg)](https://www.npmjs.com/package/@rhino-dev/rhino-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🔐 **Authentication** - Built-in auth hooks with token-based authentication
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
| `useAuth` | Authentication state and methods |
| `useOrganization` | Current organization slug |
| `useOwner` | Organization data |
| `useOrganizationExists` | Validate organization |
| `useUserRole` | Current user role and `hasRole()` helper |

### Invitations

| Hook | Purpose |
|------|---------|
| `useInvitations` | List invitations |
| `useInviteUser` | Create invitation |
| `useResendInvitation` | Resend invitation |
| `useCancelInvitation` | Cancel invitation |
| `useAcceptInvitation` | Accept invitation |

### Utilities

| Hook | Purpose |
|------|---------|
| `useToast` | Toast notifications with multi-instance sync |
| `useModelQuery` | Deprecated alias for `useModelIndex` |

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
