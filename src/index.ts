/**
 * @rhino-dev/rhino-react - Main entry point
 *
 * A comprehensive React library for Rhino backend applications with
 * full CRUD, pagination, soft deletes, and multi-tenant support.
 */

// Re-export all hooks
export * from './hooks';

// Re-export all library utilities
export * from './lib';

// Re-export context providers
export { AuthProvider, useAuth } from './context/AuthContext';
// Re-export storage and events adapters
export { storage, createWebStorage, initStorage } from './lib/storage';
export { events, createWebEvents } from './lib/events';

// Re-export TypeScript types
export type {
  PaginationMeta,
  ModelQueryOptions,
  NestedOperation,
  AuditLog,
  LoginResult,
  LoginOptions,
  QueryResponse,
  InvitationStatus,
  Invitation,
  Organization,
  User,
  Role,
  RouteGroup,
  TenancyMode,
} from './types';
