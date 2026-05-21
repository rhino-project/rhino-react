import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../lib/pagination', () => ({
  extractPaginationFromHeaders: vi.fn(),
}));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { extractPaginationFromHeaders } from '../lib/pagination';
import {
  useModelIndex,
  useModelShow,
  useModelStore,
  useModelUpdate,
  useModelDelete,
  useModelTrashed,
  useModelRestore,
  useModelForceDelete,
  useNestedOperations,
  useModelAudit,
} from '../hooks/useModel';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useModelIndex ───────────────────────────────────────────────────────────

describe('useModelIndex', () => {
  it('should return disabled state when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should call api.get with correct base URL', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    const { result } = renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users');
  });

  it('should build URL with filters', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () => useModelIndex('posts', { filters: { status: 'published', author: 'john' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('filter%5Bstatus%5D=published');
    expect(url).toContain('filter%5Bauthor%5D=john');
  });

  it('should build URL with includes, sort, fields, search, page, perPage', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () =>
        useModelIndex('posts', {
          includes: ['author', 'comments'],
          sort: '-created_at',
          fields: ['id', 'title'],
          search: 'react',
          page: 2,
          perPage: 20,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('include=author%2Ccomments');
    expect(url).toContain('sort=-created_at');
    expect(url).toContain('fields=id%2Ctitle');
    expect(url).toContain('search=react');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=20');
  });

  it('should return data and pagination from response', async () => {
    useOrganization.mockReturnValue('my-org');
    const mockPagination = { currentPage: 1, lastPage: 5, perPage: 15, total: 75 };
    api.get.mockResolvedValue({ data: [{ id: 1 }], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(mockPagination);

    const { result } = renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.data).toEqual([{ id: 1 }]);
    expect(result.current.data.pagination).toEqual(mockPagination);
  });

  it('should handle per_page as alias for perPage', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelIndex('posts', { per_page: 10 }), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('per_page=10');
  });

  it('should not call api when organization is null', () => {
    useOrganization.mockReturnValue(null);
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ─── useModelShow ────────────────────────────────────────────────────────────

describe('useModelShow', () => {
  it('should return disabled state when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelShow('users', 1), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return disabled state when id is null', () => {
    useOrganization.mockReturnValue('my-org');
    const { result } = renderHook(() => useModelShow('users', null), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should call api.get with correct URL for a single resource', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: { id: 42, name: 'Alice' } });

    renderHook(() => useModelShow('users', 42), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/42');
  });

  it('should build URL with includes and filters', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: { id: 1 } });

    renderHook(
      () => useModelShow('posts', 1, { includes: ['author'], filters: { status: 'active' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/my-org/posts/1');
    expect(url).toContain('include=author');
    expect(url).toContain('filter%5Bstatus%5D=active');
  });

  it('should return response data directly', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: { id: 42, name: 'Alice' } });

    const { result } = renderHook(() => useModelShow('users', 42), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toEqual({ id: 42, name: 'Alice' });
  });

  it('should not call api when id is falsy', () => {
    useOrganization.mockReturnValue('my-org');
    renderHook(() => useModelShow('users', null), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ─── useModelStore ───────────────────────────────────────────────────────────

describe('useModelStore', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelStore('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should POST to correct URL with data', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1, name: 'John' } });

    const { result } = renderHook(() => useModelStore('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ name: 'John', email: 'john@test.com' });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/users', { name: 'John', email: 'john@test.com' });
  });

  it('should return response data on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1, name: 'John' } });

    const { result } = renderHook(() => useModelStore('users'), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ name: 'John' });
    });

    expect(data).toEqual({ id: 1, name: 'John' });
  });

  it('should invalidate modelIndex and modelShow on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useModelStore('users'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'John' });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'users'] });
  });
});

// ─── useModelUpdate ──────────────────────────────────────────────────────────

describe('useModelUpdate', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelUpdate('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should PUT to correct URL with id and data', async () => {
    useOrganization.mockReturnValue('my-org');
    api.put.mockResolvedValue({ data: { id: 42, name: 'Updated' } });

    const { result } = renderHook(() => useModelUpdate('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 42, data: { name: 'Updated' } });
    });

    expect(api.put).toHaveBeenCalledWith('/my-org/users/42', { name: 'Updated' });
  });

  it('should return response data on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.put.mockResolvedValue({ data: { id: 42, name: 'Updated' } });

    const { result } = renderHook(() => useModelUpdate('users'), { wrapper: createWrapper() });

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ id: 42, data: { name: 'Updated' } });
    });

    expect(data).toEqual({ id: 42, name: 'Updated' });
  });

  it('should invalidate modelIndex and modelShow on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.put.mockResolvedValue({ data: { id: 42 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useModelUpdate('users'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 42, data: { name: 'Updated' } });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'users'] });
  });
});

// ─── useModelDelete ──────────────────────────────────────────────────────────

describe('useModelDelete', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelDelete('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should DELETE correct URL with id', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useModelDelete('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(api.delete).toHaveBeenCalledWith('/my-org/users/42');
  });

  it('should invalidate modelIndex and modelShow on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useModelDelete('users'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'users'] });
  });
});

// ─── useModelTrashed ─────────────────────────────────────────────────────────

describe('useModelTrashed', () => {
  it('should return disabled state when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelTrashed('users'), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should GET /org/model/trashed', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelTrashed('users'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/trashed');
  });

  it('should build URL with query options', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () =>
        useModelTrashed('posts', {
          filters: { deleted_by: 'admin' },
          sort: '-deleted_at',
          page: 2,
          perPage: 10,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/my-org/posts/trashed');
    expect(url).toContain('filter%5Bdeleted_by%5D=admin');
    expect(url).toContain('sort=-deleted_at');
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=10');
  });

  it('should return data and pagination', async () => {
    useOrganization.mockReturnValue('my-org');
    const mockPagination = { currentPage: 1, lastPage: 1, perPage: 15, total: 2 };
    api.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(mockPagination);

    const { result } = renderHook(() => useModelTrashed('users'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.data.pagination).toEqual(mockPagination);
  });
});

// ─── useModelRestore ─────────────────────────────────────────────────────────

describe('useModelRestore', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelRestore('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should POST to /org/model/id/restore', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 42 } });

    const { result } = renderHook(() => useModelRestore('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/users/42/restore');
  });

  it('should invalidate modelIndex, modelTrashed, and modelShow on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { id: 42 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useModelRestore('users'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelTrashed', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'users'] });
  });
});

// ─── useModelForceDelete ─────────────────────────────────────────────────────

describe('useModelForceDelete', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelForceDelete('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should DELETE /org/model/id/force-delete', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useModelForceDelete('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(api.delete).toHaveBeenCalledWith('/my-org/users/42/force-delete');
  });

  it('should only invalidate modelTrashed on success', async () => {
    useOrganization.mockReturnValue('my-org');
    api.delete.mockResolvedValue({ data: {} });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useModelForceDelete('users'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelTrashed', 'users'] });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['modelShow', 'users'] });
  });
});

// ─── useNestedOperations ─────────────────────────────────────────────────────

describe('useNestedOperations', () => {
  it('should throw when organization is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useNestedOperations(), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });

  it('should POST to /org/nested-operations with operations array', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { success: true } });

    const operations = [
      { action: 'create', model: 'blogs', data: { title: 'My Blog' } },
      { action: 'update', model: 'posts', id: 1, data: { title: 'Updated' } },
    ];

    const { result } = renderHook(() => useNestedOperations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ operations });
    });

    expect(api.post).toHaveBeenCalledWith('/my-org/nested-operations', { operations });
  });

  it('should invalidate all affected models deduped', async () => {
    useOrganization.mockReturnValue('my-org');
    api.post.mockResolvedValue({ data: { success: true } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const operations = [
      { action: 'create', model: 'blogs', data: { title: 'Blog' } },
      { action: 'create', model: 'posts', data: { title: 'Post' } },
      { action: 'update', model: 'blogs', id: 1, data: { title: 'Updated' } },
    ];

    const { result } = renderHook(() => useNestedOperations(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ operations });
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'blogs'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'blogs'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'posts'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelShow', 'posts'] });
    // blogs should only be invalidated once per key type despite 2 operations
    const blogIndexCalls = spy.mock.calls.filter(
      (c) => c[0].queryKey[0] === 'modelIndex' && c[0].queryKey[1] === 'blogs',
    );
    expect(blogIndexCalls).toHaveLength(1);
  });
});

// ─── useModelAudit ───────────────────────────────────────────────────────────

describe('useModelAudit', () => {
  it('should return disabled state when organization is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelAudit('users', 1), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should return disabled state when id is null', () => {
    useOrganization.mockReturnValue('my-org');
    const { result } = renderHook(() => useModelAudit('users', null), { wrapper: createWrapper() });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should GET /org/model/id/audit', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelAudit('users', 42), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/42/audit');
  });

  it('should build URL with page and perPage', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelAudit('users', 42, { page: 2, perPage: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=50');
  });
});
