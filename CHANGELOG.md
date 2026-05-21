# Changelog

All notable changes to @rhino-project/rhino-react will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Barrel exports** - Clean import paths from `@rhino-project/rhino-react`
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
import { useModelIndex } from '@rhino-project/rhino-react';
```

**Breaking Changes:**
- `useModelIndex` now returns `{ data, pagination }` instead of direct array
  - Update: `const users = useModelIndex('users')` → `const { data: response } = useModelIndex('users'); const users = response?.data || [];`

---

## Support

- [Documentation](./docs/)
- [Issues](https://github.com/yourusername/rhino-client/issues)
- [Discussions](https://github.com/yourusername/rhino-client/discussions)
