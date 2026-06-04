import axios from 'axios';
import { storage } from './storage';

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
let configuredRouteGroup = null;

/**
 * Get the route group configured via `configureApi`.
 * Used to build group-aware auth URLs (e.g. `/{routeGroup}/auth/login`).
 * Returns `null` when no group is configured (the default `/auth/*` behavior).
 * @returns {string|null}
 */
export function getRouteGroup() {
  return configuredRouteGroup;
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
  const group = routeGroup !== undefined ? routeGroup : configuredRouteGroup;
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
 * @param {Function} [options.onUnauthorized] - Callback when a 401 response is received.
 *   Defaults to redirecting to '/' on web. React Native apps should pass their own navigation logic.
 * @param {Function} [options.onForbidden] - Callback when a 403 response is received (e.g. the
 *   user is authenticated but not a member of the route group). The token is NOT cleared.
 *
 * @example
 * // Web
 * configureApi({ baseURL: import.meta.env.VITE_API_URL });
 *
 * // Group-aware (prefix-based group)
 * configureApi({ baseURL: '/api', routeGroup: 'driver' });
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
  if ('onUnauthorized' in options) {
    onUnauthorized = options.onUnauthorized || null;
  }
  if ('onForbidden' in options) {
    onForbidden = options.onForbidden || null;
  }
  if ('routeGroup' in options) {
    configuredRouteGroup = options.routeGroup || null;
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS errors
    if (!error.response && error.message && error.message.includes('CORS')) {
      console.error('CORS Error: Make sure the Rhino backend CORS config includes your frontend URL');
      return Promise.reject(new Error('CORS Error: Backend is not allowing requests from this origin. Please check your Rhino backend CORS configuration.'));
    }

    if (error.response?.status === 401) {
      // Clear token
      storage.removeItem('token');
      // Call custom handler or default web redirect
      if (onUnauthorized) {
        onUnauthorized();
      } else if (typeof window !== 'undefined') {
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
