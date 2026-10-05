import { createContext, useContext, useState, useEffect } from 'react';
import api, { buildAuthPath, configureApi } from '../lib/axios';
import { storage } from '../lib/storage';
import { events } from '../lib/events';
import { apiConfig } from '../lib/api-config';

const AuthContext = createContext(null);

export function AuthProvider({ children, routeGroup, tenancy }) {
  // If the provider is given a route group, register it with the API client so
  // group-aware auth URLs are built consistently everywhere.
  if (routeGroup !== undefined) {
    configureApi({ routeGroup });
  }
  // If the provider is given a tenancy mode, register it too so the data hooks
  // build org-scoped URLs the right way (path-prefix vs. subdomain/host).
  if (tenancy !== undefined) {
    configureApi({ tenancy });
  }

  const [token, setToken] = useState(() => storage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!storage.getItem('token'));

  // Keeps storage and `isAuthenticated` in line with the token state. Writing
  // the value storage already holds is harmless, and nothing here emits an
  // event, so it cannot feed the subscription below.
  useEffect(() => {
    if (token) {
      storage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      storage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  // Follow token changes made outside the provider: a 401 response ends the
  // session (the API client emits `null`), and `useRegister` starts one.
  useEffect(() => {
    return events.subscribe('token', (newToken) => {
      setToken(newToken || null);
    });
  }, []);

  const login = async (email, password, options = {}) => {
    // Per-call routeGroup override; falls back to the provider/configured group.
    const callRouteGroup = 'routeGroup' in options ? options.routeGroup : routeGroup;
    try {
      const response = await api.post(buildAuthPath('login', callRouteGroup), { email, password });
      const responseStatus = response?.status;
      const { token: newToken, user, organization, organization_slug, organizations, route_group } = response.data || {};
      // Write the token before resolving, so a request issued right after
      // `await login()` is already authenticated. The state update below only
      // re-renders; the effect that mirrors it to storage is then a no-op.
      if (newToken) {
        storage.setItem('token', newToken);
      }
      setToken(newToken);

      // Store user data if provided in login response
      if (user) {
        storage.setItem('user', JSON.stringify(user));
      }

      // Extract first organization from login response (backend returns first org user is part of)
      let firstOrganizationSlug = null;
      if (organization_slug) {
        firstOrganizationSlug = organization_slug;
      } else if (organization && organization.slug) {
        firstOrganizationSlug = organization.slug;
      } else if (organizations && organizations.length > 0) {
        firstOrganizationSlug = organizations[0].slug;
      } else if (user) {
        // Fallback: check user object for organization
        if (user.organization_slug) {
          firstOrganizationSlug = user.organization_slug;
        } else if (user.organizations && user.organizations.length > 0) {
          firstOrganizationSlug = user.organizations[0].slug;
        } else if (user.organization && user.organization.slug) {
          firstOrganizationSlug = user.organization.slug;
        }
      }

      // Store organization for future use
      if (firstOrganizationSlug) {
        storage.setItem('last_organization', firstOrganizationSlug);
        storage.setItem('organization_slug', firstOrganizationSlug);
        // Hooks that were mounted before the login read the organization from
        // this event; without it they would stay idle until remounted.
        events.emit('organization_slug', firstOrganizationSlug);
      }

      // Persist the route group used for this login. Prefer the value the
      // backend echoes back (`route_group`), otherwise the one we logged in with.
      // With no per-call or provider group, that is the group set through
      // `configureApi({ routeGroup })`, which is what built the login URL.
      const usedRouteGroup = callRouteGroup !== undefined ? callRouteGroup : apiConfig.routeGroup;
      const resolvedRouteGroup = route_group != null ? route_group : (usedRouteGroup ?? null);
      if (resolvedRouteGroup) {
        storage.setItem('route_group', resolvedRouteGroup);
        events.emit('route_group', resolvedRouteGroup);
      }

      return {
        success: true,
        user: user || null,
        organization: firstOrganizationSlug ? { slug: firstOrganizationSlug } : null,
        organization_slug: firstOrganizationSlug,
        route_group: resolvedRouteGroup,
        token: newToken ?? null,
        status: responseStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
        // Surface the HTTP status so callers can distinguish e.g. 401 (bad
        // credentials) from 403 (group membership denied).
        status: error.response?.status,
      };
    }
  };

  const logout = async (options = {}) => {
    const callRouteGroup = 'routeGroup' in options ? options.routeGroup : routeGroup;
    try {
      await api.post(buildAuthPath('logout', callRouteGroup));
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      // Clear user data, organization and route group on logout
      storage.removeItem('user');
      storage.removeItem('last_organization');
      storage.removeItem('organization_slug');
      storage.removeItem('route_group');
      events.emit('route_group', null);
    }
  };

  const setOrganization = (slug) => {
    if (slug) {
      storage.setItem('organization_slug', slug);
      storage.setItem('last_organization', slug);
    } else {
      storage.removeItem('organization_slug');
      storage.removeItem('last_organization');
    }
    // Notify other components about the organization change
    events.emit('organization_slug', slug);
  };

  const setRouteGroup = (group) => {
    if (group) {
      storage.setItem('route_group', group);
    } else {
      storage.removeItem('route_group');
    }
    // Notify other components about the route group change
    events.emit('route_group', group);
  };

  const value = {
    token,
    isAuthenticated,
    login,
    logout,
    setOrganization,
    setRouteGroup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
