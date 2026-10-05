import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import api from '../lib/axios';
import { useModelStore, useModelUpdate } from '../hooks/useModel';
import { stubAdapter, createClient, wrapperFor } from './helpers/realApi';

// These run against the REAL axios instance (stub adapter), so the assertions
// see the request after axios' own body/header transforms.

let requests;
let queryClient;

const contentType = (config) => String(config.headers.getContentType() || '');
const mutate = async (hook, variables) => {
  const { result } = renderHook(hook, { wrapper: wrapperFor(queryClient) });
  await act(async () => { await result.current.mutateAsync(variables); });
};
const formWithFile = () => {
  const form = new FormData();
  form.append('title', 'Report');
  form.append('file', new Blob(['abc'], { type: 'text/plain' }), 'a.txt');
  return form;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('organization_slug', 'my-org');
  requests = stubAdapter(() => ({ data: { id: 1 } }));
  queryClient = createClient();
});

describe('JSON bodies are unchanged', () => {
  it('useModelStore POSTs JSON', async () => {
    await mutate(() => useModelStore('documents'), { title: 'Report' });

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/my-org/documents');
    expect(contentType(requests[0])).toBe('application/json');
    expect(requests[0].data).toBe('{"title":"Report"}');
  });

  it('useModelUpdate PUTs JSON', async () => {
    await mutate(() => useModelUpdate('documents'), { id: 7, data: { title: 'Report' } });

    expect(requests[0].method).toBe('put');
    expect(requests[0].url).toBe('/my-org/documents/7');
    expect(contentType(requests[0])).toBe('application/json');
    expect(requests[0].data).toBe('{"title":"Report"}');
  });
});

describe('FormData bodies', () => {
  it('useModelStore POSTs the form intact, without a JSON content type', async () => {
    const form = formWithFile();
    await mutate(() => useModelStore('documents'), form);

    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/my-org/documents');
    expect(requests[0].data).toBe(form);
    expect(requests[0].data.get('file')).toBeInstanceOf(Blob);
    expect(contentType(requests[0])).not.toContain('json');
    expect(contentType(requests[0])).toBe('multipart/form-data');
  });

  it('useModelUpdate POSTs the form with X-HTTP-Method-Override: PUT and no _method field', async () => {
    const form = formWithFile();
    await mutate(() => useModelUpdate('documents'), { id: 7, data: form });

    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/my-org/documents/7');
    expect(requests[0].headers.get('X-HTTP-Method-Override')).toBe('PUT');
    expect(requests[0].data).toBe(form);
    // Rhino treats every form field as an attribute and rejects `_method`.
    expect(requests[0].data.has('_method')).toBe(false);
    expect([...requests[0].data.keys()]).toEqual(['title', 'file']);
    expect(requests[0].data.get('file')).toBeInstanceOf(Blob);
    expect(contentType(requests[0])).toBe('multipart/form-data');
  });

  it('a caller-provided _method is kept as is, and no override header is added', async () => {
    const form = formWithFile();
    form.append('_method', 'PATCH');
    await mutate(() => useModelUpdate('documents'), { id: 7, data: form });

    expect(requests[0].method).toBe('post');
    expect(requests[0].data.getAll('_method')).toEqual(['PATCH']);
    expect(requests[0].headers.has('X-HTTP-Method-Override')).toBe(false);
  });

  it('the caller\'s form is never mutated, so it can be retried', async () => {
    const form = formWithFile();
    await mutate(() => useModelUpdate('documents'), { id: 7, data: form });
    await mutate(() => useModelUpdate('documents'), { id: 7, data: form });

    expect([...form.keys()]).toEqual(['title', 'file']);
    expect(requests.map((config) => config.headers.get('X-HTTP-Method-Override'))).toEqual(['PUT', 'PUT']);
  });

  it('detects _method on a FormData without has() (React Native polyfill)', async () => {
    const form = formWithFile();
    form.append('_method', 'PATCH');
    form.has = undefined;
    form.getParts = () => [{ fieldName: 'title' }, { fieldName: '_method' }];
    await mutate(() => useModelUpdate('documents'), { id: 7, data: form });

    expect(requests[0].headers.has('X-HTTP-Method-Override')).toBe(false);
  });

  it('store and JSON update never carry the override header', async () => {
    await mutate(() => useModelStore('documents'), formWithFile());
    await mutate(() => useModelUpdate('documents'), { id: 7, data: { title: 'x' } });
    expect(requests.map((config) => config.headers.has('X-HTTP-Method-Override'))).toEqual([false, false]);
  });

  it('without the override axios would serialize the form to JSON and drop the file', async () => {
    // Pins the reason the hooks set a per-request content type.
    await api.post('/my-org/documents', formWithFile());
    expect(typeof requests[0].data).toBe('string');
    expect(requests[0].data).not.toContain('abc');
  });

  it('invalidates the same queries as a JSON mutation', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await mutate(() => useModelStore('documents'), formWithFile());
    await mutate(() => useModelUpdate('documents'), { id: 7, data: formWithFile() });

    for (const root of ['modelIndex', 'modelInfinite', 'modelShow']) {
      expect(invalidate.mock.calls.filter(([filter]) => filter.queryKey[0] === root)).toEqual([
        [{ queryKey: [root, 'documents'] }],
        [{ queryKey: [root, 'documents'] }],
      ]);
    }
  });
});
