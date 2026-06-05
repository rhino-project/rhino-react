import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the axios layer. `getTenancy` is the knob under test, so it's a
// configurable mock we flip per-describe-block.
const tenancyState = { mode: 'path' };

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getTenancy: vi.fn(() => tenancyState.mode),
}));

vi.mock('../hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../lib/pagination', () => ({
  extractPaginationFromHeaders: vi.fn(),
}));

import api, { getTenancy } from '../lib/axios';
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
  tenancyState.mode = 'path';
  getTenancy.mockImplementation(() => tenancyState.mode);
  useOrganization.mockReturnValue('my-org');
  extractPaginationFromHeaders.mockReturnValue(null);
});

// ─── Default / path mode regression guards ─────────────────────────────────────
// These re-assert today's byte-for-byte URLs through the same code path that
// the subdomain mode now flows through, guarding against accidental regressions.

describe('tenancy: path (default) — org segment is present', () => {
  it('useModelIndex hits /{org}/{model}', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users');
  });

  it('useModelShow hits /{org}/{model}/{id}', async () => {
    api.get.mockResolvedValue({ data: { id: 42 } });
    renderHook(() => useModelShow('users', 42), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/42');
  });

  it('useModelStore POSTs /{org}/{model}', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const { result } = renderHook(() => useModelStore('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ name: 'John' }); });
    expect(api.post).toHaveBeenCalledWith('/my-org/users', { name: 'John' });
  });

  it('useModelUpdate PUTs /{org}/{model}/{id}', async () => {
    api.put.mockResolvedValue({ data: { id: 42 } });
    const { result } = renderHook(() => useModelUpdate('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 42, data: { name: 'X' } }); });
    expect(api.put).toHaveBeenCalledWith('/my-org/users/42', { name: 'X' });
  });

  it('useModelDelete DELETEs /{org}/{model}/{id}', async () => {
    api.delete.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useModelDelete('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.delete).toHaveBeenCalledWith('/my-org/users/42');
  });

  it('useModelTrashed hits /{org}/{model}/trashed', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelTrashed('users'), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/trashed');
  });

  it('useModelRestore POSTs /{org}/{model}/{id}/restore', async () => {
    api.post.mockResolvedValue({ data: { id: 42 } });
    const { result } = renderHook(() => useModelRestore('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.post).toHaveBeenCalledWith('/my-org/users/42/restore');
  });

  it('useModelForceDelete DELETEs /{org}/{model}/{id}/force-delete', async () => {
    api.delete.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useModelForceDelete('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.delete).toHaveBeenCalledWith('/my-org/users/42/force-delete');
  });

  it('useNestedOperations POSTs /{org}/nested-operations', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    const ops = [{ action: 'create', model: 'blogs', data: {} }];
    const { result } = renderHook(() => useNestedOperations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ operations: ops }); });
    expect(api.post).toHaveBeenCalledWith('/my-org/nested-operations', { operations: ops });
  });

  it('useModelAudit hits /{org}/{model}/{id}/audit', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelAudit('users', 42), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/my-org/users/42/audit');
  });

  it('preserves query params after the org segment', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('posts', { sort: '-created_at', page: 2 }), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url.startsWith('/my-org/posts?')).toBe(true);
    expect(url).toContain('sort=-created_at');
    expect(url).toContain('page=2');
  });
});

// ─── Subdomain mode — org segment is omitted ───────────────────────────────────
// With tenancy:'subdomain' and an org in context, the org is carried by the host,
// so the data hooks build /{model} (and /{model}/{id} etc.) with NO org segment.

describe("tenancy: subdomain — org segment is omitted (org carried by host)", () => {
  beforeEach(() => {
    tenancyState.mode = 'subdomain';
  });

  it('useModelIndex hits /{model} (no org)', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users');
  });

  it('useModelIndex still applies query params without an org segment', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('posts', { sort: '-created_at', page: 2 }), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url.startsWith('/posts?')).toBe(true);
    expect(url).not.toContain('my-org');
    expect(url).toContain('sort=-created_at');
    expect(url).toContain('page=2');
  });

  it('useModelShow hits /{model}/{id} (no org)', async () => {
    api.get.mockResolvedValue({ data: { id: 42 } });
    renderHook(() => useModelShow('users', 42), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users/42');
  });

  it('useModelShow hits /{model}/{id} with query params (no org)', async () => {
    api.get.mockResolvedValue({ data: { id: 1 } });
    renderHook(() => useModelShow('posts', 1, { includes: ['author'] }), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const url = api.get.mock.calls[0][0];
    expect(url.startsWith('/posts/1?')).toBe(true);
    expect(url).not.toContain('my-org');
    expect(url).toContain('include=author');
  });

  it('useModelStore POSTs /{model} (no org)', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const { result } = renderHook(() => useModelStore('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ name: 'John' }); });
    expect(api.post).toHaveBeenCalledWith('/users', { name: 'John' });
  });

  it('useModelUpdate PUTs /{model}/{id} (no org)', async () => {
    api.put.mockResolvedValue({ data: { id: 42 } });
    const { result } = renderHook(() => useModelUpdate('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 42, data: { name: 'X' } }); });
    expect(api.put).toHaveBeenCalledWith('/users/42', { name: 'X' });
  });

  it('useModelDelete DELETEs /{model}/{id} (no org)', async () => {
    api.delete.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useModelDelete('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.delete).toHaveBeenCalledWith('/users/42');
  });

  it('useModelTrashed hits /{model}/trashed (no org)', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelTrashed('users'), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users/trashed');
  });

  it('useModelRestore POSTs /{model}/{id}/restore (no org)', async () => {
    api.post.mockResolvedValue({ data: { id: 42 } });
    const { result } = renderHook(() => useModelRestore('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.post).toHaveBeenCalledWith('/users/42/restore');
  });

  it('useModelForceDelete DELETEs /{model}/{id}/force-delete (no org)', async () => {
    api.delete.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useModelForceDelete('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(42); });
    expect(api.delete).toHaveBeenCalledWith('/users/42/force-delete');
  });

  it('useNestedOperations POSTs /nested-operations (no org)', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    const ops = [{ action: 'create', model: 'blogs', data: {} }];
    const { result } = renderHook(() => useNestedOperations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ operations: ops }); });
    expect(api.post).toHaveBeenCalledWith('/nested-operations', { operations: ops });
  });

  it('useModelAudit hits /{model}/{id}/audit (no org)', async () => {
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelAudit('users', 42), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users/42/audit');
  });

  it('does NOT require an org in context (mutations work when org is null)', async () => {
    useOrganization.mockReturnValue(null);
    api.post.mockResolvedValue({ data: { id: 1 } });
    const { result } = renderHook(() => useModelStore('users'), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ name: 'John' }); });
    expect(api.post).toHaveBeenCalledWith('/users', { name: 'John' });
  });

  it('queries are enabled and hit /{model} when org is null', async () => {
    useOrganization.mockReturnValue(null);
    api.get.mockResolvedValue({ data: [], headers: {} });
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users');
  });

  it('useModelShow is enabled and hits /{model}/{id} when org is null', async () => {
    useOrganization.mockReturnValue(null);
    api.get.mockResolvedValue({ data: { id: 7 } });
    renderHook(() => useModelShow('users', 7), { wrapper: createWrapper() });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/users/7');
  });
});

// ─── Path mode regression — still gated/disabled without an org ─────────────────
describe('tenancy: path (default) — still requires an org', () => {
  it('queries stay disabled when org is null', () => {
    useOrganization.mockReturnValue(null);
    renderHook(() => useModelIndex('users'), { wrapper: createWrapper() });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('mutations throw when org is null', () => {
    useOrganization.mockReturnValue(null);
    expect(() => {
      renderHook(() => useModelStore('users'), { wrapper: createWrapper() });
    }).toThrow('Organization slug is required');
  });
});
