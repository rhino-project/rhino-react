import { ReactNode, ReactElement } from 'react';

export type RouteGroup = string | null;

export interface LoginOptions {
  /** Route group override for this call (defaults to the provider/configured group). */
  routeGroup?: RouteGroup;
}

export interface LoginResult {
  success: boolean;
  user?: any;
  organization?: any;
  organization_slug?: string;
  /** The route group the user logged into, if any. */
  route_group?: RouteGroup;
  error?: string;
}

export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<LoginResult>;
  logout: (options?: LoginOptions) => Promise<void>;
  setOrganization: (slug: string | null) => void;
  setRouteGroup: (group: RouteGroup) => void;
}

export function AuthProvider(props: {
  children: ReactNode;
  /** Optional route group used to build group-aware auth URLs. */
  routeGroup?: RouteGroup;
  /**
   * How the organization is conveyed to the backend by the data hooks.
   * `'path'` (default) prepends the org slug (`/api/{org}/{model}`); `'subdomain'`
   * omits it (`/api/{model}`) because the org is carried by the host.
   */
  tenancy?: 'path' | 'subdomain';
}): ReactElement;
export function useAuth(): AuthContextValue;
