import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { configureApi } from '../lib/axios';
import { buildModelUrl, modelKeys, fetchModelIndex, fetchModelShow } from '../lib/model';
import {
  useModelIndex,
  useModelInfinite,
  useModelShow,
  useModelComputedAttributes,
  useModelTrashed,
  useModelAudit,
} from '../hooks/useModel';
import { stubAdapter, createClient, wrapperFor } from './helpers/realApi';

let requests;
let queryClient;

const reset = () =>
  configureApi({ baseURL: '/api', routeGroup: null, tenancy: 'path', routeGroupInDataPath: false });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('organization_slug', 'acme');
  reset();
  requests = stubAdapter(() => ({
    data: { data: [{ id: 1 }] },
    headers: { 'x-current-page': '1', 'x-last-page': '3', 'x-per-page': '15', 'x-total': '40' },
  }));
  queryClient = createClient();
});

afterEach(reset);

const listOptions = {
  filters: { status: 'open', trip_id: 7 },
  includes: ['driver', 'stops'],
  sort: '-created_at',
  fields: ['id', 'status'],
  search: 'north',
  scope: { since: '2026-01-01' },
  computedAttributes: { eta: { unit: 'min' } },
  page: 2,
  perPage: 50,
};
const computedOptions = { attributes: ['open_count'], filters: { status: 'open' }, search: 'n', scope: 'mine' };

// Each row: the hook, the key the factory returns, the URL buildModelUrl returns.
const cases = [
  ['index, no options', () => useModelIndex('trips'), () => modelKeys.index('trips', {}), () => buildModelUrl('trips')],
  ['index', () => useModelIndex('trips', listOptions), () => modelKeys.index('trips', listOptions), () => buildModelUrl('trips', listOptions)],
  ['show, no options', () => useModelShow('trips', 9), () => modelKeys.show('trips', 9, {}), () => buildModelUrl('trips', {}, { id: 9 })],
  ['show', () => useModelShow('trips', 9, listOptions), () => modelKeys.show('trips', 9, listOptions), () => buildModelUrl('trips', listOptions, { id: 9 })],
  ['show, string id', () => useModelShow('trips', 'abc'), () => modelKeys.show('trips', 'abc', {}), () => buildModelUrl('trips', {}, { id: 'abc' })],
  ['computed', () => useModelComputedAttributes('trips', computedOptions), () => modelKeys.computed('trips', computedOptions), () => buildModelUrl('trips', computedOptions, { suffix: 'computed' })],
  ['trashed', () => useModelTrashed('trips', listOptions), () => modelKeys.trashed('trips', listOptions), () => buildModelUrl('trips', listOptions, { suffix: 'trashed' })],
  ['audit', () => useModelAudit('trips', 9, { page: 2, perPage: 5 }), () => modelKeys.audit('trips', 9, { page: 2, perPage: 5 }), () => buildModelUrl('trips', { page: 2, perPage: 5 }, { id: 9, suffix: 'audit' })],
  ['infinite', () => useModelInfinite('trips', { perPage: 5 }), () => modelKeys.infinite('trips', { perPage: 5 }), () => buildModelUrl('trips', { perPage: 5, page: 1 })],
];

const setups = [
  ['default', {}],
  ['subdomain', { tenancy: 'subdomain' }],
  ['none', { tenancy: 'none' }],
  ['group + none', { tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true }],
  ['group + path', { tenancy: 'path', routeGroup: 'client', routeGroupInDataPath: true }],
];

describe.each(setups)('setup: %s', (_setup, config) => {
  it.each(cases)('%s: modelKeys equals the registered key, buildModelUrl equals the requested URL', async (_name, hook, key, url) => {
    configureApi(config);
    renderHook(hook, { wrapper: wrapperFor(queryClient) });
    await waitFor(() => expect(requests).toHaveLength(1));

    const registered = queryClient.getQueryCache().getAll().map((query) => query.queryKey);
    expect(registered).toEqual([key()]);
    expect(requests[0].url).toBe(url());
  });
});

describe('modelKeys', () => {
  it('returns the literal arrays', () => {
    const options = { page: 2 };
    expect(modelKeys.index('trips', options)).toEqual(['modelIndex', 'trips', 'acme', options]);
    expect(modelKeys.infinite('trips', options)).toEqual(['modelInfinite', 'trips', 'acme', options]);
    expect(modelKeys.show('trips', 9, options)).toEqual(['modelShow', 'trips', 9, 'acme', options]);
    expect(modelKeys.computed('trips', options)).toEqual(['modelComputedAttributes', 'trips', 'acme', options]);
    expect(modelKeys.trashed('trips', options)).toEqual(['modelTrashed', 'trips', 'acme', options]);
    expect(modelKeys.audit('trips', 9, options)).toEqual(['modelAudit', 'trips', 9, 'acme', options]);
  });

  it('partial forms are prefixes', () => {
    expect(modelKeys.index('trips')).toEqual(['modelIndex', 'trips']);
    expect(modelKeys.infinite('trips')).toEqual(['modelInfinite', 'trips']);
    expect(modelKeys.show('trips')).toEqual(['modelShow', 'trips']);
    expect(modelKeys.show('trips', 9)).toEqual(['modelShow', 'trips', 9]);
    expect(modelKeys.computed('trips')).toEqual(['modelComputedAttributes', 'trips']);
    expect(modelKeys.trashed('trips')).toEqual(['modelTrashed', 'trips']);
    expect(modelKeys.audit('trips')).toEqual(['modelAudit', 'trips']);
    expect(modelKeys.audit('trips', 9)).toEqual(['modelAudit', 'trips', 9]);
  });

  it('reads the organization from storage unless one is passed', () => {
    expect(modelKeys.index('trips', {})[2]).toBe('acme');
    expect(modelKeys.index('trips', {}, 'other')[2]).toBe('other');
    expect(modelKeys.index('trips', {}, null)[2]).toBeNull();
    localStorage.removeItem('organization_slug');
    expect(modelKeys.index('trips', {})[2]).toBeNull();
  });

  async function seed() {
    renderHook(() => useModelIndex('trips'), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelInfinite('trips'), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelShow('trips', 9), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelShow('trips', 10), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelComputedAttributes('trips'), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelTrashed('trips'), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelAudit('trips', 9), { wrapper: wrapperFor(queryClient) });
    renderHook(() => useModelIndex('trucks'), { wrapper: wrapperFor(queryClient) });
    await waitFor(() => expect(requests).toHaveLength(8));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  }
  const invalidated = () =>
    queryClient.getQueryCache().getAll().filter((query) => query.state.isInvalidated).map((query) => query.queryKey);

  it('a prefix invalidates exactly its queries', async () => {
    await seed();
    await queryClient.invalidateQueries({ queryKey: modelKeys.show('trips', 9), refetchType: 'none' });
    expect(invalidated()).toEqual([['modelShow', 'trips', 9, 'acme', {}]]);

    await queryClient.invalidateQueries({ queryKey: modelKeys.show('trips'), refetchType: 'none' });
    expect(invalidated().map((key) => key[2])).toEqual([9, 10]);
  });

  it('all(model) is a filter matching every query of that model and no other', async () => {
    await seed();
    await queryClient.invalidateQueries({ ...modelKeys.all('trips'), refetchType: 'none' });

    expect(invalidated().map((key) => key[0]).sort()).toEqual([
      'modelAudit', 'modelComputedAttributes', 'modelIndex', 'modelInfinite', 'modelShow', 'modelShow', 'modelTrashed',
    ]);
    expect(invalidated().every((key) => key[1] === 'trips')).toBe(true);
  });
});

describe('buildModelUrl', () => {
  it('builds every target', () => {
    expect(buildModelUrl('trips')).toBe('/acme/trips');
    expect(buildModelUrl('trips', { page: 2, per_page: 10 })).toBe('/acme/trips?page=2&per_page=10');
    expect(buildModelUrl('trips', {}, { id: 9 })).toBe('/acme/trips/9');
    expect(buildModelUrl('trips', {}, { suffix: 'computed' })).toBe('/acme/trips/computed');
    expect(buildModelUrl('trips', {}, { suffix: 'trashed' })).toBe('/acme/trips/trashed');
    expect(buildModelUrl('trips', {}, { id: 9, suffix: 'audit' })).toBe('/acme/trips/9/audit');
    expect(buildModelUrl('trips', { page: 2 }, { id: 9, suffix: 'restore' })).toBe('/acme/trips/9/restore');
  });

  it('a show URL carries no scope, search or pagination', () => {
    expect(buildModelUrl('trips', { scope: 'mine', search: 'x', page: 2, includes: ['driver'] }, { id: 9 })).toBe(
      '/acme/trips/9?include=driver',
    );
  });

  it('uses an explicit organization over the stored one', () => {
    expect(buildModelUrl('trips', {}, { organization: 'other' })).toBe('/other/trips');
  });

  it('works outside React with no organization in none/subdomain tenancy', () => {
    localStorage.clear();
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    expect(buildModelUrl('trips', { perPage: 5 })).toBe('/driver/trips?per_page=5');
    configureApi({ tenancy: 'subdomain', routeGroupInDataPath: false });
    expect(buildModelUrl('trips')).toBe('/trips');
  });

  it('throws in path tenancy when no organization is stored or passed', () => {
    localStorage.clear();
    expect(() => buildModelUrl('trips')).toThrow('Organization slug is required');
  });
});

describe('fetchModelIndex / fetchModelShow', () => {
  it('fetchModelIndex returns what useModelIndex caches, from the same URL', async () => {
    const options = { filters: { status: 'open' }, perPage: 15 };
    const fetched = await queryClient.fetchQuery({
      queryKey: modelKeys.index('trips', options),
      queryFn: () => fetchModelIndex('trips', options),
    });
    expect(fetched).toEqual({
      data: [{ id: 1 }],
      pagination: { currentPage: 1, lastPage: 3, perPage: 15, total: 40 },
    });

    // A hook mounted afterwards reads the prefetched entry instead of requesting.
    const { result } = renderHook(() => useModelIndex('trips', options, { staleTime: 60_000 }), {
      wrapper: wrapperFor(queryClient),
    });
    expect(result.current.data).toEqual(fetched);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/acme/trips?filter%5Bstatus%5D=open&per_page=15');
  });

  it('fetchModelShow returns what useModelShow caches, from the same URL', async () => {
    requests = stubAdapter(() => ({ data: { data: { id: 9, status: 'open' } } }));
    await queryClient.prefetchQuery({
      queryKey: modelKeys.show('trips', 9, {}),
      queryFn: () => fetchModelShow('trips', 9),
    });

    const { result } = renderHook(() => useModelShow('trips', 9, {}, { staleTime: 60_000 }), {
      wrapper: wrapperFor(queryClient),
    });
    expect(result.current.data).toEqual({ id: 9, status: 'open' });
    expect(requests.map((config) => config.url)).toEqual(['/acme/trips/9']);
  });

  it('take an explicit organization', async () => {
    await fetchModelIndex('trips', {}, { organization: 'other' });
    await fetchModelShow('trips', 9, {}, { organization: 'other' });
    expect(requests.map((config) => config.url)).toEqual(['/other/trips', '/other/trips/9']);
  });

  it('reject in path tenancy without an organization', async () => {
    localStorage.clear();
    await expect(fetchModelIndex('trips')).rejects.toThrow('Organization slug is required');
    await expect(fetchModelShow('trips', 9)).rejects.toThrow('Organization slug is required');
    expect(requests).toHaveLength(0);
  });
});
