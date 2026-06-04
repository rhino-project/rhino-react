import { AxiosInstance, AxiosError } from 'axios';

export interface ConfigureApiOptions {
  baseURL?: string;
  /** Optional route group used to build group-aware auth URLs (`/{routeGroup}/auth/*`). */
  routeGroup?: string | null;
  onUnauthorized?: () => void;
  /** Called on a 403 response (membership denied). The token is NOT cleared. */
  onForbidden?: (error: AxiosError) => void;
}

export function configureApi(options?: ConfigureApiOptions): void;

/** Returns the route group configured via `configureApi`, or null. */
export function getRouteGroup(): string | null;

/**
 * Build a group-aware auth path. With a route group: `/{routeGroup}/auth/{action}`.
 * Without one: `/auth/{action}`.
 */
export function buildAuthPath(action: string, routeGroup?: string | null): string;

declare const api: AxiosInstance;
export default api;
