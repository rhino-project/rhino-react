/**
 * TypeScript type definitions for @rhino/client
 */

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
 * Login result from authentication
 */
export interface LoginResult {
  success: boolean;
  user?: any;
  organization?: { slug: string };
  organization_slug?: string;
  error?: string;
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
