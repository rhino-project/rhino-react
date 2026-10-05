import { AxiosInstance, AxiosError } from 'axios';
import type { StorageAdapter } from './storage';

/** How the organization is conveyed to the backend by the data hooks. */
export type TenancyMode = 'path' | 'subdomain' | 'none';

export interface ConfigureApiOptions {
  baseURL?: string;
  /** Optional route group used to build group-aware auth URLs (`/{routeGroup}/auth/*`). */
  routeGroup?: string | null;
  /**
   * How the org is conveyed to the backend by the data hooks. `'path'` (default) prepends
   * the org slug as a path segment (`/api/{org}/{model}`); `'subdomain'` omits the org
   * segment (`/api/{model}`) because the org is carried by the request host; `'none'`
   * omits it because there is no organization at all.
   */
  tenancy?: TenancyMode;
  /**
   * Also prepend the configured `routeGroup` to data-hook URLs:
   * `/api/{routeGroup}/{model}` with `tenancy: 'none'`, `/api/{routeGroup}/{org}/{model}`
   * with `tenancy: 'path'`. Defaults to `false`.
   */
  routeGroupInDataPath?: boolean;
  /**
   * Path segment of the nested-operations endpoint (`useNestedOperations`). Defaults to
   * `'nested'`, the servers' default `nested.path`.
   */
  nestedPath?: string;
  /** Request timeout in milliseconds. Defaults to none. */
  timeout?: number;
  /** Whether requests send cookies. Defaults to `true`. */
  withCredentials?: boolean;
  /**
   * Called on a 401 response from any request except login. The token and user are
   * cleared from storage and `AuthProvider` resets before this runs.
   */
  onUnauthorized?: () => void;
  /** Called on a 403 response (membership denied). The token is NOT cleared. */
  onForbidden?: (error: AxiosError) => void;
  /**
   * Custom storage adapter for the token/user/org values. Defaults to the platform
   * store (localStorage on web, AsyncStorage on React Native). Desktop (Electron) apps
   * pass a safeStorage-backed adapter here (see `createElectronStorage`).
   */
  storage?: StorageAdapter;
}

export function configureApi(options?: ConfigureApiOptions): void;

/** Returns the route group configured via `configureApi`, or null. */
export function getRouteGroup(): string | null;

/** Returns the multitenancy mode configured via `configureApi` (default `'path'`). */
export function getTenancy(): TenancyMode;

/** Whether the configured route group is prepended to data-hook URLs (default `false`). */
export function getRouteGroupInDataPath(): boolean;

/**
 * Build a group-aware auth path. With a route group: `/{routeGroup}/auth/{action}`.
 * Without one: `/auth/{action}`.
 */
export function buildAuthPath(action: string, routeGroup?: string | null): string;

declare const api: AxiosInstance;
export default api;
