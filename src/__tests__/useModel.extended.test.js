import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

function createWrapper(queryClient = null) {
  const qc = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useModelIndex – Extended ──────────────────────────────────────────────────

describe('useModelIndex – edge cases', () => {
  it('should handle empty options gracefully', async () => {
    useOrganization.mockReturnValue('my-org');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    const { result } = renderHook(() => useModelIndex('users', {}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users');
  });

  it('should include search parameter alone', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelIndex('posts', { search: 'typescript' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('search=typescript');
    expect(url).not.toContain('filter');
  });

  it('should handle special characters in filter values', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () => useModelIndex('posts', { filters: { name: 'O\'Brien & Co.' } }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('filter%5Bname%5D=');
  });

  it('should handle empty includes array', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelIndex('posts', { includes: [] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).not.toContain('include');
  });

  it('should handle empty fields array', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelIndex('posts', { fields: [] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).not.toContain('fields');
  });

  it('should return pagination data from headers', async () => {
    useOrganization.mockReturnValue('org-1');
    const mockPagination = { currentPage: 3, lastPage: 10, perPage: 25, total: 250 };
    api.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(mockPagination);

    const { result } = renderHook(() => useModelIndex('posts'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.pagination).toEqual(mockPagination);
    expect(result.current.data.data).toHaveLength(2);
  });

  it('should handle API error gracefully', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockRejectedValue(new Error('Server Error'));

    const { result } = renderHook(() => useModelIndex('posts'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Server Error');
  });

  it('should use correct query key structure', () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'getQueryCache');

    renderHook(() => useModelIndex('posts', { page: 1 }), {
      wrapper: createWrapper(queryClient),
    });

    const queries = queryClient.getQueryCache().findAll();
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0].queryKey[0]).toBe('modelIndex');
    expect(queries[0].queryKey[1]).toBe('posts');
  });

  it('should handle page as number 0', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelIndex('posts', { page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    // page=0 is falsy, so should not be included
    const url = api.get.mock.calls[0][0];
    expect(url).not.toContain('page=0');
  });
});

// ─── useModelShow – Extended ──────────────────────────────────────────────────

describe('useModelShow – edge cases', () => {
  it('should not call API when id is undefined', () => {
    useOrganization.mockReturnValue('org-1');
    renderHook(() => useModelShow('users', undefined), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should not call API when id is 0', () => {
    useOrganization.mockReturnValue('org-1');
    renderHook(() => useModelShow('users', 0), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should call API with string id', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: { id: 'uuid-123' } });

    renderHook(() => useModelShow('users', 'uuid-123'), { wrapper: createWrapper() });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/org-1/users/uuid-123');
  });

  it('should build URL with sort parameter', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: { id: 1 } });

    renderHook(
      () => useModelShow('posts', 1, { sort: '-created_at' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('sort=-created_at');
  });

  it('should build URL with fields parameter', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: { id: 1, title: 'Hi' } });

    renderHook(
      () => useModelShow('posts', 1, { fields: ['id', 'title', 'body'] }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('fields=id%2Ctitle%2Cbody');
  });

  it('should handle API error', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockRejectedValue(new Error('Not Found'));

    const { result } = renderHook(() => useModelShow('users', 99), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Not Found');
  });

  it('should be disabled when both org is null and id is null', () => {
    useOrganization.mockReturnValue(null);
    const { result } = renderHook(() => useModelShow('users', null), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ─── useModelStore – Extended ──────────────────────────────────────────────────

describe('useModelStore – edge cases', () => {
  it('should handle empty data payload', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useModelStore('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(api.post).toHaveBeenCalledWith('/org-1/posts', {});
  });

  it('should propagate server errors', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockRejectedValue(new Error('Validation Error'));

    const { result } = renderHook(() => useModelStore('posts'), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ title: '' });
      }),
    ).rejects.toThrow('Validation Error');
  });

  it('should handle nested data objects', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: { id: 1 } });

    const payload = {
      title: 'Post',
      metadata: { tags: ['a', 'b'], priority: 1 },
    };

    const { result } = renderHook(() => useModelStore('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(api.post).toHaveBeenCalledWith('/org-1/posts', payload);
  });
});

// ─── useModelUpdate – Extended ─────────────────────────────────────────────────

describe('useModelUpdate – edge cases', () => {
  it('should handle partial updates', async () => {
    useOrganization.mockReturnValue('org-1');
    api.put.mockResolvedValue({ data: { id: 1, title: 'Updated', body: 'Unchanged' } });

    const { result } = renderHook(() => useModelUpdate('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: { title: 'Updated' } });
    });

    expect(api.put).toHaveBeenCalledWith('/org-1/posts/1', { title: 'Updated' });
  });

  it('should handle string IDs', async () => {
    useOrganization.mockReturnValue('org-1');
    api.put.mockResolvedValue({ data: { id: 'uuid-1' } });

    const { result } = renderHook(() => useModelUpdate('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 'uuid-1', data: { title: 'Hi' } });
    });

    expect(api.put).toHaveBeenCalledWith('/org-1/posts/uuid-1', { title: 'Hi' });
  });

  it('should propagate server errors on update', async () => {
    useOrganization.mockReturnValue('org-1');
    api.put.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useModelUpdate('posts'), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: 1, data: { title: 'x' } });
      }),
    ).rejects.toThrow('Forbidden');
  });
});

// ─── useModelDelete – Extended ─────────────────────────────────────────────────

describe('useModelDelete – edge cases', () => {
  it('should handle string IDs', async () => {
    useOrganization.mockReturnValue('org-1');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useModelDelete('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('uuid-456');
    });

    expect(api.delete).toHaveBeenCalledWith('/org-1/posts/uuid-456');
  });

  it('should propagate server errors on delete', async () => {
    useOrganization.mockReturnValue('org-1');
    api.delete.mockRejectedValue(new Error('Cannot delete'));

    const { result } = renderHook(() => useModelDelete('posts'), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync(1);
      }),
    ).rejects.toThrow('Cannot delete');
  });
});

// ─── useModelTrashed – Extended ────────────────────────────────────────────────

describe('useModelTrashed – edge cases', () => {
  it('should not call API when org is null', () => {
    useOrganization.mockReturnValue(null);
    renderHook(() => useModelTrashed('posts'), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should handle includes and fields in trashed query', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () =>
        useModelTrashed('posts', {
          includes: ['author'],
          fields: ['id', 'title'],
          search: 'test',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/org-1/posts/trashed');
    expect(url).toContain('include=author');
    expect(url).toContain('fields=id%2Ctitle');
    expect(url).toContain('search=test');
  });

  it('should support per_page alias', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(
      () => useModelTrashed('posts', { per_page: 5 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('per_page=5');
  });
});

// ─── useModelRestore – Extended ────────────────────────────────────────────────

describe('useModelRestore – edge cases', () => {
  it('should handle string IDs', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: { id: 'uuid-1' } });

    const { result } = renderHook(() => useModelRestore('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('uuid-1');
    });

    expect(api.post).toHaveBeenCalledWith('/org-1/posts/uuid-1/restore');
  });

  it('should propagate errors', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockRejectedValue(new Error('Already restored'));

    const { result } = renderHook(() => useModelRestore('posts'), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync(1);
      }),
    ).rejects.toThrow('Already restored');
  });
});

// ─── useModelForceDelete – Extended ────────────────────────────────────────────

describe('useModelForceDelete – edge cases', () => {
  it('should handle string IDs', async () => {
    useOrganization.mockReturnValue('org-1');
    api.delete.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useModelForceDelete('posts'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('uuid-1');
    });

    expect(api.delete).toHaveBeenCalledWith('/org-1/posts/uuid-1/force-delete');
  });
});

// ─── useNestedOperations – Extended ────────────────────────────────────────────

describe('useNestedOperations – edge cases', () => {
  it('should handle single operation', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: [{ id: 1 }] });

    const { result } = renderHook(() => useNestedOperations(), {
      wrapper: createWrapper(),
    });

    const operations = [
      { action: 'create', model: 'posts', data: { title: 'Post' } },
    ];

    await act(async () => {
      await result.current.mutateAsync({ operations });
    });

    expect(api.post).toHaveBeenCalledWith('/org-1/nested-operations', { operations });
  });

  it('should handle operations with cross-references ($0.id)', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

    const operations = [
      { action: 'create', model: 'blogs', data: { title: 'Blog' } },
      { action: 'create', model: 'posts', data: { title: 'Post', blog_id: '$0.id' } },
    ];

    const { result } = renderHook(() => useNestedOperations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ operations });
    });

    expect(api.post).toHaveBeenCalledWith('/org-1/nested-operations', { operations });
  });

  it('should propagate errors from nested operations', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockRejectedValue(new Error('Transaction failed'));

    const { result } = renderHook(() => useNestedOperations(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          operations: [{ action: 'create', model: 'posts', data: {} }],
        });
      }),
    ).rejects.toThrow('Transaction failed');
  });

  it('should handle mixed operation types', async () => {
    useOrganization.mockReturnValue('org-1');
    api.post.mockResolvedValue({ data: [] });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useNestedOperations(), {
      wrapper: createWrapper(queryClient),
    });

    const operations = [
      { action: 'create', model: 'users', data: { name: 'John' } },
      { action: 'update', model: 'posts', id: 1, data: { title: 'X' } },
      { action: 'delete', model: 'comments', id: 5 },
    ];

    await act(async () => {
      await result.current.mutateAsync({ operations });
    });

    // Should invalidate 3 unique models
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'users'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'posts'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['modelIndex', 'comments'] });
  });
});

// ─── useModelAudit – Extended ──────────────────────────────────────────────────

describe('useModelAudit – edge cases', () => {
  it('should not call API when id is undefined', () => {
    useOrganization.mockReturnValue('org-1');
    renderHook(() => useModelAudit('users', undefined), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should not call API when id is 0', () => {
    useOrganization.mockReturnValue('org-1');
    renderHook(() => useModelAudit('users', 0), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should return audit data with pagination', async () => {
    useOrganization.mockReturnValue('org-1');
    const logs = [
      { id: 1, action: 'created', user_id: 1 },
      { id: 2, action: 'updated', user_id: 2 },
    ];
    const mockPagination = { currentPage: 1, lastPage: 1, perPage: 50, total: 2 };
    api.get.mockResolvedValue({ data: logs, headers: {} });
    extractPaginationFromHeaders.mockReturnValue(mockPagination);

    const { result } = renderHook(() => useModelAudit('users', 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.data).toEqual(logs);
    expect(result.current.data.pagination).toEqual(mockPagination);
  });

  it('should support per_page alias', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockResolvedValue({ data: [], headers: {} });
    extractPaginationFromHeaders.mockReturnValue(null);

    renderHook(() => useModelAudit('users', 1, { per_page: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('per_page=100');
  });

  it('should handle API errors', async () => {
    useOrganization.mockReturnValue('org-1');
    api.get.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useModelAudit('users', 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Forbidden');
  });
});
