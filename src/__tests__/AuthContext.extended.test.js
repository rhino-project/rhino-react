import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the API module
vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '../lib/axios';

const wrapper = ({ children }) => createElement(AuthProvider, null, children);

describe('AuthContext – login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should login successfully and store token', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'jwt-abc-123',
        user: { id: 1, name: 'Alice' },
        organization_slug: 'acme-corp',
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('alice@acme.com', 'password123');
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toEqual({ id: 1, name: 'Alice' });
    expect(loginResult.organization_slug).toBe('acme-corp');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('jwt-abc-123');
    expect(localStorage.getItem('token')).toBe('jwt-abc-123');
  });

  it('should call POST /auth/login with email and password', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('user@test.com', 'secret');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@test.com',
      password: 'secret',
    });
  });

  it('should extract organization_slug from top-level response', async () => {
    api.post.mockResolvedValue({
      data: { token: 'tok', organization_slug: 'org-1' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('org-1');
    expect(localStorage.getItem('organization_slug')).toBe('org-1');
    expect(localStorage.getItem('last_organization')).toBe('org-1');
  });

  it('should extract slug from organization.slug when organization_slug is absent', async () => {
    api.post.mockResolvedValue({
      data: { token: 'tok', organization: { slug: 'org-2', name: 'Org Two' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('org-2');
  });

  it('should extract slug from organizations array when no direct slug', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'tok',
        organizations: [{ slug: 'first-org' }, { slug: 'second-org' }],
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('first-org');
  });

  it('should fallback to user.organization_slug', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'tok',
        user: { id: 1, organization_slug: 'user-org' },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('user-org');
  });

  it('should fallback to user.organizations[0].slug', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'tok',
        user: { id: 1, organizations: [{ slug: 'user-org-list' }] },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('user-org-list');
  });

  it('should fallback to user.organization.slug', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'tok',
        user: { id: 1, organization: { slug: 'nested-org' } },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.organization_slug).toBe('nested-org');
  });

  it('should handle login with no organization in response', async () => {
    api.post.mockResolvedValue({
      data: { token: 'tok', user: { id: 1, name: 'Solo' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.organization_slug).toBeNull();
    expect(loginResult.organization).toBeNull();
    expect(localStorage.getItem('organization_slug')).toBeNull();
  });

  it('should store user data on login', async () => {
    const user = { id: 1, name: 'Alice', email: 'alice@test.com' };
    api.post.mockResolvedValue({ data: { token: 'tok', user } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('a@b.com', 'p');
    });

    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
  });

  it('should return error on login failure', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('wrong@test.com', 'bad');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return generic message when no error message from server', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Login failed');
  });

  it('should handle empty response data gracefully', async () => {
    api.post.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('a@b.com', 'p');
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeNull();
  });
});

describe('AuthContext – logout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should call POST /auth/logout', async () => {
    api.post
      .mockResolvedValueOnce({ data: { token: 'tok' } }) // login
      .mockResolvedValueOnce({}); // logout

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('a@b.com', 'p');
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('should clear token and set isAuthenticated to false', async () => {
    localStorage.setItem('token', 'existing');
    api.post.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should clear user and organization data from storage', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    localStorage.setItem('last_organization', 'org');
    localStorage.setItem('organization_slug', 'org');

    api.post.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('last_organization')).toBeNull();
    expect(localStorage.getItem('organization_slug')).toBeNull();
  });

  it('should continue logout even if API call fails', async () => {
    localStorage.setItem('token', 'tok');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.post.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('AuthContext – token persistence via useEffect', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should persist token to storage when login sets it', async () => {
    api.post.mockResolvedValue({ data: { token: 'new-token' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('a@b.com', 'p');
    });

    // useEffect should have persisted the token
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('should remove token from storage when set to null', async () => {
    localStorage.setItem('token', 'old-token');
    api.post.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});
