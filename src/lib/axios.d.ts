import { AxiosInstance, AxiosError } from 'axios';

/** How the organization is conveyed to the backend by the data hooks. */
export type TenancyMode = 'path' | 'subdomain';

export interface ConfigureApiOptions {
  baseURL?: string;
  /** Optional route group used to build group-aware auth URLs (`/{routeGroup}/auth/*`). */
  routeGroup?: string | null;
  /**
   * How the org is conveyed to the backend by the data hooks. `'path'` (default) prepends
   * the org slug as a path segment (`/api/{org}/{model}`); `'subdomain'` omits the org
   * segment (`/api/{model}`) because the org is carried by the request host.
   */
  tenancy?: TenancyMode;
  onUnauthorized?: () => void;
  /** Called on a 403 response (membership denied). The token is NOT cleared. */
  onForbidden?: (error: AxiosError) => void;
}

export function configureApi(options?: ConfigureApiOptions): void;

/** Returns the route group configured via `configureApi`, or null. */
export function getRouteGroup(): string | null;

/** Returns the multitenancy mode configured via `configureApi` (default `'path'`). */
export function getTenancy(): TenancyMode;

/**
 * Build a group-aware auth path. With a route group: `/{routeGroup}/auth/{action}`.
 * Without one: `/auth/{action}`.
 */
export function buildAuthPath(action: string, routeGroup?: string | null): string;

declare const api: AxiosInstance;
export default api;
