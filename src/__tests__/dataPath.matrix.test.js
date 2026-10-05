import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import api, { configureApi, getTenancy, getRouteGroupInDataPath } from '../lib/axios';
import {
  useModelIndex,
  useModelInfinite,
  useModelShow,
  useModelComputedAttributes,
  useModelTrashed,
  useModelAudit,
  useModelStore,
  useModelUpdate,
  useModelDelete,
  useModelRestore,
  useModelForceDelete,
  useNestedOperations,
} from '../hooks/useModel';
import { useOwner } from '../hooks/useOwner';
import { useUserRole } from '../hooks/useUserRole';
import {
  useInvitations,
  useInviteUser,
  useResendInvitation,
  useCancelInvitation,
  useAcceptInvitation,
} from '../hooks/useInvitations';
import { stubAdapter, wrapperFor } from './helpers/realApi';

// Real configureApi + real axios instance: every hook's final URL per setup.

let requests;

const reset = () =>
  configureApi({ baseURL: '/api', routeGroup: null, tenancy: 'path', routeGroupInDataPath: false });

beforeEach(() => {
  localStorage.clear();
  reset();
  requests = stubAdapter(() => ({ data: [] }));
});

afterEach(reset);

/** Render every data hook once and return `METHOD url` per request, in a stable order. */
async function requestsOfEveryDataHook() {
  const queries = [
    () => useModelIndex('trucks'),
    () => useModelInfinite('trucks'),
    () => useModelShow('trucks', 5),
    () => useModelComputedAttributes('trucks'),
    () => useModelTrashed('trucks'),
    () => useModelAudit('trucks', 5),
  ];
  for (const hook of queries) {
    const before = requests.length;
    renderHook(hook, { wrapper: wrapperFor() });
    await waitFor(() => expect(requests.length).toBe(before + 1));
  }

  const mutations = [
    [() => useModelStore('trucks'), { plate: 'A' }],
    [() => useModelUpdate('trucks'), { id: 5, data: { plate: 'B' } }],
    [() => useModelDelete('trucks'), 5],
    [() => useModelRestore('trucks'), 5],
    [() => useModelForceDelete('trucks'), 5],
    [() => useNestedOperations(), { operations: [{ action: 'create', model: 'trucks', data: {} }] }],
  ];
  for (const [hook, variables] of mutations) {
    const { result } = renderHook(hook, { wrapper: wrapperFor() });
    await act(async () => { await result.current.mutateAsync(variables); });
  }

  return requests.map((config) => `${config.method.toUpperCase()} ${config.url}`);
}

const dataUrls = (base) => [
  `GET ${base}/trucks`,
  `GET ${base}/trucks?page=1`,
  `GET ${base}/trucks/5`,
  `GET ${base}/trucks/computed`,
  `GET ${base}/trucks/trashed`,
  `GET ${base}/trucks/5/audit`,
  `POST ${base}/trucks`,
  `PUT ${base}/trucks/5`,
  `DELETE ${base}/trucks/5`,
  `POST ${base}/trucks/5/restore`,
  `DELETE ${base}/trucks/5/force-delete`,
  `POST ${base}/nested`,
];

describe('data hook URLs per setup', () => {
  it('default (tenancy: path, nothing configured): /{organization}/{model} — unchanged', async () => {
    localStorage.setItem('organization_slug', 'acme');
    expect(getTenancy()).toBe('path');
    expect(getRouteGroupInDataPath()).toBe(false);
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/acme'));
  });

  it('tenancy: path with a route group but no routeGroupInDataPath: unchanged', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ routeGroup: 'client' });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/acme'));
  });

  it('tenancy: subdomain: /{model} — unchanged', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ tenancy: 'subdomain', routeGroup: 'client' });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls(''));
  });

  it('tenancy: none: /{model}, with no organization anywhere', async () => {
    configureApi({ tenancy: 'none' });
    expect(getTenancy()).toBe('none');
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls(''));
  });

  it('tenancy: none ignores a stored organization', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ tenancy: 'none' });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls(''));
  });

  it('prefix group without organization: /{routeGroup}/{model}', async () => {
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    expect(getRouteGroupInDataPath()).toBe(true);
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/driver'));
  });

  it('prefix group with organization: /{routeGroup}/{organization}/{model}', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ tenancy: 'path', routeGroup: 'client', routeGroupInDataPath: true });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/client/acme'));
  });

  it('prefix group on a subdomain tenant: /{routeGroup}/{model}', async () => {
    configureApi({ tenancy: 'subdomain', routeGroup: 'client', routeGroupInDataPath: true });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/client'));
  });

  it('routeGroupInDataPath without a route group adds nothing', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ routeGroupInDataPath: true });
    expect(await requestsOfEveryDataHook()).toEqual(dataUrls('/acme'));
  });

  it('routeGroupInDataPath does not change auth URLs', async () => {
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    await api.post('/driver/auth/login', {});
    expect(requests[0].url).toBe('/driver/auth/login');
  });
});

describe('nestedPath', () => {
  afterEach(() => configureApi({ nestedPath: 'nested' }));

  it('defaults to the servers\' default, /nested', async () => {
    localStorage.setItem('organization_slug', 'acme');
    const { result } = renderHook(() => useNestedOperations(), { wrapper: wrapperFor() });
    await act(async () => { await result.current.mutateAsync({ operations: [] }); });
    expect(requests[0].url).toBe('/acme/nested');
  });

  it('can be configured to match a custom server path', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ nestedPath: '/nested-operations/' });
    const { result } = renderHook(() => useNestedOperations(), { wrapper: wrapperFor() });
    await act(async () => { await result.current.mutateAsync({ operations: [] }); });
    expect(requests[0].url).toBe('/acme/nested-operations');
  });

  it('ignores empty values', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ nestedPath: '' });
    configureApi({ nestedPath: undefined });
    const { result } = renderHook(() => useNestedOperations(), { wrapper: wrapperFor() });
    await act(async () => { await result.current.mutateAsync({ operations: [] }); });
    expect(requests[0].url).toBe('/acme/nested');
  });
});

describe('tenancy: path still requires an organization', () => {
  it('queries stay idle and mutations throw without one', async () => {
    renderHook(() => useModelIndex('trucks'), { wrapper: wrapperFor() });
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(requests).toHaveLength(0);
    expect(() => renderHook(() => useModelStore('trucks'), { wrapper: wrapperFor() })).toThrow(
      'Organization slug is required',
    );
  });
});

describe('logout does not break a tenancy: none app', () => {
  it('data hooks keep working with every organization key removed', async () => {
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    localStorage.removeItem('organization_slug');
    localStorage.removeItem('last_organization');
    renderHook(() => useModelIndex('trucks'), { wrapper: wrapperFor() });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].url).toBe('/driver/trucks');
  });
});

describe('unknown tenancy values fall back to path', () => {
  it.each([undefined, null, 'bogus'])('%s -> path', (value) => {
    configureApi({ tenancy: 'none' });
    configureApi({ tenancy: value });
    expect(getTenancy()).toBe('path');
  });
});

// useOwner / useUserRole / useInvitations address organization resources, so
// they always carry the organization segment and need one to run.
describe('tenant-only hooks', () => {
  async function tenantUrls() {
    renderHook(() => useOwner(), { wrapper: wrapperFor() });
    await waitFor(() => expect(requests.length).toBe(1));
    renderHook(() => useInvitations('pending'), { wrapper: wrapperFor() });
    await waitFor(() => expect(requests.length).toBe(2));
    // useUserRole renders useOwner again (its own client) plus the roles query.
    renderHook(() => useUserRole(), { wrapper: wrapperFor() });
    await waitFor(() => expect(requests.length).toBe(4));

    const mutations = [
      [() => useInviteUser(), { email: 'a@b.c', role_id: 1 }],
      [() => useResendInvitation(), 3],
      [() => useCancelInvitation(), 3],
      [() => useAcceptInvitation(), 'tok'],
    ];
    for (const [hook, variables] of mutations) {
      const { result } = renderHook(hook, { wrapper: wrapperFor() });
      await act(async () => { await result.current.mutateAsync(variables); });
    }
    return [...new Set(requests.map((config) => `${config.method.toUpperCase()} ${config.url}`))].sort();
  }

  const expected = (base) => [
    `DELETE ${base}/acme/invitations/3`,
    `GET ${base}/acme/invitations?status=pending`,
    `GET ${base}/acme/organizations?filter[slug]=acme&include=users`,
    `GET ${base}/acme/roles`,
    `POST ${base}/acme/invitations`,
    `POST ${base}/acme/invitations/3/resend`,
    'POST /invitations/accept',
  ].sort();

  it('default: /{organization}/… — unchanged', async () => {
    localStorage.setItem('organization_slug', 'acme');
    expect(await tenantUrls()).toEqual(expected(''));
  });

  it('subdomain: still /{organization}/… — unchanged', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ tenancy: 'subdomain' });
    expect(await tenantUrls()).toEqual(expected(''));
  });

  it('routeGroupInDataPath: /{routeGroup}/{organization}/…, accept stays unprefixed', async () => {
    localStorage.setItem('organization_slug', 'acme');
    configureApi({ routeGroup: 'client', routeGroupInDataPath: true });
    expect(await tenantUrls()).toEqual(expected('/client'));
  });

  it('tenancy: none without an organization: they request nothing', async () => {
    configureApi({ tenancy: 'none', routeGroup: 'driver', routeGroupInDataPath: true });
    const owner = renderHook(() => useOwner(), { wrapper: wrapperFor() });
    const invitations = renderHook(() => useInvitations(), { wrapper: wrapperFor() });
    const role = renderHook(() => useUserRole(), { wrapper: wrapperFor() });
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(requests).toHaveLength(0);
    expect(owner.result.current.data).toBeNull();
    expect(invitations.result.current.isError).toBe(true);
    expect(role.result.current.roles).toEqual([]);
  });
});
