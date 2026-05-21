import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { storage } from '../lib/storage';
import { events } from '../lib/events';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!storage.getItem('token'));

  useEffect(() => {
    if (token) {
      storage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      storage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user, organization, organization_slug, organizations } = response.data || {};
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
      }

      return {
        success: true,
        user: user || null,
        organization: firstOrganizationSlug ? { slug: firstOrganizationSlug } : null,
        organization_slug: firstOrganizationSlug
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      // Clear user data and organization on logout
      storage.removeItem('user');
      storage.removeItem('last_organization');
      storage.removeItem('organization_slug');
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

  const value = {
    token,
    isAuthenticated,
    login,
    logout,
    setOrganization,
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
