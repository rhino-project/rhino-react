import { useMutation } from '@tanstack/react-query';
import api, { buildAuthPath } from '../lib/axios';
import { storage } from '../lib/storage';
import { events } from '../lib/events';

/**
 * Hook to register a new user (typically via an invitation token).
 * Respects the configured route group; a per-call `routeGroup` overrides it.
 *
 * POST `{authBase}/auth/register` with
 * `{ token, name, email, password, password_confirmation }`.
 *
 * A successful registration starts a session, exactly like `login()`: the
 * returned token, user and organization are written to storage before the
 * mutation resolves and `AuthProvider` becomes authenticated, so a request
 * issued right after `await register.mutateAsync(...)` carries the bearer token.
 *
 * @returns {Object} React Query mutation. Returns the backend response (token + user).
 *
 * @example
 * const register = useRegister();
 * await register.mutateAsync({ token, name, email, password, password_confirmation });
 */
export function useRegister() {
  return useMutation({
    mutationFn: ({ token, name, email, password, password_confirmation, routeGroup } = {}) => {
      const url = buildAuthPath('register', routeGroup);
      return api
        .post(url, { token, name, email, password, password_confirmation })
        .then((res) => {
          const data = res.data || {};
          // Persist the route group if the backend echoes one back.
          if (data.route_group) {
            storage.setItem('route_group', data.route_group);
            events.emit('route_group', data.route_group);
          }
          // The server issues a token on registration: start the session.
          if (data.token) {
            storage.setItem('token', data.token);
            if (data.user) {
              storage.setItem('user', JSON.stringify(data.user));
            }
            if (data.organization_slug) {
              storage.setItem('last_organization', data.organization_slug);
              storage.setItem('organization_slug', data.organization_slug);
              events.emit('organization_slug', data.organization_slug);
            }
            events.emit('token', data.token);
          }
          return data;
        });
    },
  });
}

/**
 * Hook to request a password recovery email.
 * Respects the configured route group; a per-call `routeGroup` overrides it.
 *
 * POST `{authBase}/auth/password/recover` with `{ email }`.
 *
 * @returns {Object} React Query mutation.
 *
 * @example
 * const recover = usePasswordRecover();
 * await recover.mutateAsync({ email });
 */
export function usePasswordRecover() {
  return useMutation({
    mutationFn: ({ email, routeGroup } = {}) => {
      const url = buildAuthPath('password/recover', routeGroup);
      return api.post(url, { email }).then((res) => res.data);
    },
  });
}

/**
 * Hook to reset a password using a reset token.
 * Respects the configured route group; a per-call `routeGroup` overrides it.
 *
 * POST `{authBase}/auth/password/reset` with
 * `{ token, email, password, password_confirmation }`.
 *
 * @returns {Object} React Query mutation.
 *
 * @example
 * const reset = useResetPassword();
 * await reset.mutateAsync({ token, email, password, password_confirmation });
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, email, password, password_confirmation, routeGroup } = {}) => {
      const url = buildAuthPath('password/reset', routeGroup);
      return api
        .post(url, { token, email, password, password_confirmation })
        .then((res) => res.data);
    },
  });
}
