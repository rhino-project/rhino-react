import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

const wrapper = ({ children }) => createElement(AuthProvider, null, children);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should start unauthenticated when no token stored', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should start authenticated when token exists in storage', () => {
    localStorage.setItem('token', 'existing-token');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('existing-token');
  });

  it('should expose login, logout, setOrganization methods', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.login).toBeTypeOf('function');
    expect(result.current.logout).toBeTypeOf('function');
    expect(result.current.setOrganization).toBeTypeOf('function');
  });

  it('should throw when useAuth is used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('setOrganization should store slug in storage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.setOrganization('my-org');
    });

    expect(localStorage.getItem('organization_slug')).toBe('my-org');
    expect(localStorage.getItem('last_organization')).toBe('my-org');
  });

  it('setOrganization with null should clear storage', () => {
    localStorage.setItem('organization_slug', 'my-org');
    localStorage.setItem('last_organization', 'my-org');

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.setOrganization(null);
    });

    expect(localStorage.getItem('organization_slug')).toBeNull();
    expect(localStorage.getItem('last_organization')).toBeNull();
  });
});
