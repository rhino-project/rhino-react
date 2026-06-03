/**
 * Regression coverage for the Rhino-server `{ data: ... }` envelope handling
 * added in v4.0.1. The hooks must transparently unwrap one level so consumers
 * get the typed payload (`result.data.data` is `T[]`, `result.data` is `T`)
 * without having to dig through `result.data.data.data`.
 *
 * Existing tests in `useModel.test.js` cover the bare-array shape; this file
 * targets the Laravel-style enveloped shape and asserts both flow through
 * the same public API.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../hooks/useOrganization', () => ({ useOrganization: vi.fn() }));
vi.mock('../lib/pagination', () => ({ extractPaginationFromHeaders: vi.fn() }));

import api from '../lib/axios';
import { useOrganization } from '../hooks/useOrganization';
import { extractPaginationFromHeaders } from '../lib/pagination';
import {
  useModelIndex,
  useModelShow,
  useModelTrashed,
  useModelAudit,
} from '../hooks/useModel';

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  useOrganization.mockReturnValue('acme-corp');
  extractPaginationFromHeaders.mockReturnValue(null);
});

describe('Rhino envelope unwrapping (v4.0.1)', () => {
  describe('useModelIndex', () => {
    it('unwraps `{ data: T[] }` envelope into a flat array', async () => {
      api.get.mockResolvedValue({ data: { data: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }] }, headers: {} });
      const { result } = renderHook(() => useModelIndex('projects'), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data.data).toEqual([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    });

    it('accepts a bare-array response (backward compatible)', async () => {
      api.get.mockResolvedValue({ data: [{ id: 1 }], headers: {} });
      const { result } = renderHook(() => useModelIndex('projects'), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data.data).toEqual([{ id: 1 }]);
    });
  });

  describe('useModelShow', () => {
    it('unwraps `{ data: T }` envelope into the record', async () => {
      api.get.mockResolvedValue({ data: { data: { id: 7, title: 'Hello' } }, headers: {} });
      const { result } = renderHook(() => useModelShow('projects', 7), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ id: 7, title: 'Hello' });
    });

    it('accepts a bare-object response (backward compatible)', async () => {
      api.get.mockResolvedValue({ data: { id: 7, title: 'Hello' }, headers: {} });
      const { result } = renderHook(() => useModelShow('projects', 7), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ id: 7, title: 'Hello' });
    });
  });

  describe('useModelTrashed', () => {
    it('unwraps envelope into a flat array', async () => {
      api.get.mockResolvedValue({ data: { data: [{ id: 9 }] }, headers: {} });
      const { result } = renderHook(() => useModelTrashed('projects'), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data.data).toEqual([{ id: 9 }]);
    });
  });

  describe('useModelAudit', () => {
    it('unwraps envelope for audit log lists', async () => {
      api.get.mockResolvedValue({ data: { data: [{ id: 1, action: 'updated' }] }, headers: {} });
      const { result } = renderHook(() => useModelAudit('projects', 1), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data.data).toEqual([{ id: 1, action: 'updated' }]);
    });
  });
});
