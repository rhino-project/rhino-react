import axios from 'axios';
import { storage, setStorageAdapter } from './storage';
import { events } from './events';
import { apiConfig } from './api-config';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Required for Sanctum cookie-based auth
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

let onUnauthorized = null;
let onForbidden = null;

/**
 * Get the route group configured via `configureApi`.
 * Used to build group-aware auth URLs (e.g. `/{routeGroup}/auth/login`).
 * Returns `null` when no group is configured (the default `/auth/*` behavior).
 * @returns {string|null}
 */
export function getRouteGroup() {
  return apiConfig.routeGroup;
}

/**
 * Get the multitenancy mode configured via `configureApi`.
 *
 * - `'path'` (default): the org slug is prepended to data-hook URLs as a path
 *   segment, e.g. `/api/{org}/{model}` — byte-for-byte today's behavior.
 * - `'subdomain'`: the org is conveyed by the request HOST (e.g.
 *   `{org}.example.com`), so data-hook URLs omit the org segment entirely
 *   (`/api/{model}`). The org may still be tracked in context for display/filtering.
 * - `'none'`: there is no organization at all, so data-hook URLs omit the org
 *   segment (`/api/{model}`) and no org is required.
 *
 * @returns {'path'|'subdomain'|'none'}
 */
export function getTenancy() {
  return apiConfig.tenancy;
}

/**
 * Whether the configured route group is prepended to data-hook URLs
 * (`configureApi({ routeGroupInDataPath: true })`). Defaults to `false`: the
 * route group shapes auth URLs only.
 * @returns {boolean}
 */
export function getRouteGroupInDataPath() {
  return apiConfig.routeGroupInDataPath;
}

/**
 * Build a group-aware auth path for a given action.
 * With a route group: `/${routeGroup}/auth/${action}`.
 * Without one (default): `/auth/${action}` — byte-for-byte today's URLs.
 *
 * @param {string} action - Auth action (e.g. 'login', 'logout', 'register', 'password/recover').
 * @param {string|null} [routeGroup] - Explicit override. Falls back to the configured group.
 * @returns {string}
 */
export function buildAuthPath(action, routeGroup) {
  const group = routeGroup !== undefined ? routeGroup : apiConfig.routeGroup;
  return group ? `/${group}/auth/${action}` : `/auth/${action}`;
}

/**
 * Configure the API client base URL and behavior.
 * Call this early in your app (e.g., in main.tsx) before making any API calls.
 *
 * @param {Object} options
 * @param {string} [options.baseURL] - API base URL
 * @param {string|null} [options.routeGroup] - Optional route group used to build group-aware
 *   auth URLs. When set, auth paths become `/{routeGroup}/auth/*`; when unset, the legacy
 *   `/auth/*` paths are used. Pass `null` to clear a previously configured group.
 * @param {'path'|'subdomain'|'none'} [options.tenancy] - How the organization is conveyed to the
 *   backend by the data hooks (`useModelIndex`, `useModelShow`, etc.). Defaults to `'path'`
 *   (today's behavior): the org slug is prepended as a path segment (`/api/{org}/{model}`).
 *   Set to `'subdomain'` for domain/host-based route groups (e.g. `{org}.example.com`), where
 *   the org is carried by the host and the data hooks build `/api/{model}` with NO org segment.
 *   The org may still be tracked in context for display/filtering. Set to `'none'` when there
 *   is no organization at all (e.g. a prefix route group without a tenant): same URLs as
 *   `'subdomain'`, and no org is required.
 * @param {boolean} [options.routeGroupInDataPath] - When `true`, the configured `routeGroup` is
 *   also prepended to data-hook URLs: `/api/{routeGroup}/{model}` with `tenancy: 'none'` and
 *   `/api/{routeGroup}/{org}/{model}` with `tenancy: 'path'`. Defaults to `false` (the route
 *   group shapes auth URLs only).
 * @param {string} [options.nestedPath] - Path segment of the nested-operations endpoint used by
 *   `useNestedOperations`. Defaults to `'nested'`, the servers' default; set it to whatever the
 *   server's `nested.path` is configured to.
 * @param {number} [options.timeout] - Request timeout in milliseconds. Defaults to none.
 * @param {boolean} [options.withCredentials] - Whether requests send cookies. Defaults to
 *   `true` (Sanctum cookie auth). Bearer-token apps (React Native) can pass `false`.
 * @param {Function} [options.onUnauthorized] - Callback when a 401 response is received on any
 *   request except login (a rejected login is reported by `login()` itself and does not end a
 *   session). Defaults to redirecting to '/' on web. React Native apps should pass their own
 *   navigation logic.
 * @param {Function} [options.onForbidden] - Callback when a 403 response is received (e.g. the
 *   user is authenticated but not a member of the route group). The token is NOT cleared.
 * @param {{getItem,setItem,removeItem}} [options.storage] - Custom storage adapter for the
 *   token/user/org values. Defaults to the platform store (localStorage on web, AsyncStorage
 *   on React Native). Desktop (Electron) apps pass a safeStorage-backed adapter here, e.g.
 *   `configureApi({ storage: createElectronStorage() })`.
 *
 * @example
 * // Web
 * configureApi({ baseURL: import.meta.env.VITE_API_URL });
 *
 * // Group-aware (prefix-based group)
 * configureApi({ baseURL: '/api', routeGroup: 'driver' });
 *
 * // Subdomain/host-based multitenancy (org carried by the host, not the path)
 * configureApi({ baseURL: '/api', tenancy: 'subdomain' });
 *
 * // React Native
 * configureApi({
 *   baseURL: 'https://api.example.com/api',
 *   onUnauthorized: () => navigation.navigate('Login'),
 *   onForbidden: (error) => showMembershipDenied(error),
 * });
 */
export function configureApi(options = {}) {
  if (options.baseURL) {
    api.defaults.baseURL = options.baseURL;
  }
  if (options.storage) {
    // Plug in a custom storage adapter (e.g. Electron safeStorage-backed store,
    // or a custom token vault). Token reads/writes throughout the lib route here.
    setStorageAdapter(options.storage);
  }
  if ('onUnauthorized' in options) {
    onUnauthorized = options.onUnauthorized || null;
  }
  if ('onForbidden' in options) {
    onForbidden = options.onForbidden || null;
  }
  if ('routeGroup' in options) {
    apiConfig.routeGroup = options.routeGroup || null;
  }
  if ('tenancy' in options) {
    // Only 'subdomain' and 'none' switch behavior; anything else (incl.
    // undefined/null) falls back to the default 'path' so existing URLs stay
    // byte-for-byte.
    apiConfig.tenancy =
      options.tenancy === 'subdomain' || options.tenancy === 'none' ? options.tenancy : 'path';
  }
  if ('routeGroupInDataPath' in options) {
    apiConfig.routeGroupInDataPath = options.routeGroupInDataPath === true;
  }
  if (typeof options.nestedPath === 'string' && options.nestedPath.trim()) {
    apiConfig.nestedPath = options.nestedPath.trim().replace(/^\/+|\/+$/g, '');
  }
  if (typeof options.timeout === 'number') {
    api.defaults.timeout = options.timeout;
  }
  if (typeof options.withCredentials === 'boolean') {
    api.defaults.withCredentials = options.withCredentials;
  }
}

// Request interceptor to attach token from storage
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Whether a request targets a login endpoint (`/auth/login` or
 * `/{routeGroup}/auth/login`, whichever group the call used). A 401 there means
 * wrong credentials, not an expired session.
 */
function isLoginRequest(config) {
  const path = String(config?.url || '').split('?')[0];
  return /(^|\/)auth\/login\/?$/.test(path);
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS errors
    if (!error.response && error.message && error.message.includes('CORS')) {
      console.error('CORS Error: Make sure the Rhino backend CORS config includes your frontend URL');
      return Promise.reject(new Error('CORS Error: Backend is not allowing requests from this origin. Please check your Rhino backend CORS configuration.'));
    }

    if (error.response?.status === 401 && !isLoginRequest(error.config)) {
      // The session is gone: clear it from storage and tell AuthProvider, which
      // resets its own state from the event.
      storage.removeItem('token');
      storage.removeItem('user');
      events.emit('token', null);
      // Call custom handler or default web redirect
      if (onUnauthorized) {
        onUnauthorized();
      } else if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/';
      }
    }

    if (error.response?.status === 403) {
      // Membership denied: the user IS authenticated but not a member of the
      // route group. Do NOT clear the token. Surface to the app via onForbidden.
      if (onForbidden) {
        onForbidden(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
