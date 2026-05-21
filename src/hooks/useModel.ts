import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useOrganization } from './useOrganization';
import { extractPaginationFromHeaders } from '../lib/pagination';
import type { AxiosResponse } from 'axios';
import type { ModelQueryOptions, QueryResponse, AuditLog, NestedOperation } from '../types';

/**
 * Helper to build query URL with filters, includes, etc.
 */
function buildQueryUrl(model: string, organization: string, options: ModelQueryOptions = {}): string {
  if (!organization) {
    throw new Error('Organization slug is required');
  }

  const orgSlug = String(organization).trim();
  if (!orgSlug) {
    throw new Error('Organization slug is required and must be a non-empty string');
  }

  let url = `/${orgSlug}/${model}`;
  const params = new URLSearchParams();

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      params.append(`filter[${key}]`, value);
    });
  }

  if (options.includes && options.includes.length > 0) {
    params.append('include', options.includes.join(','));
  }

  if (options.sort) {
    params.append('sort', options.sort);
  }

  if (options.fields && options.fields.length > 0) {
    params.append('fields', options.fields.join(','));
  }

  if (options.search) {
    params.append('search', options.search);
  }

  if (options.page) {
    params.append('page', String(options.page));
  }
  if (options.perPage || options.per_page) {
    params.append('per_page', String(options.perPage || options.per_page));
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Hook to fetch a list of models (index)
 *
 * @example
 * // Simple usage
 * const { data: response } = useModelIndex('users');
 * const users = response?.data || [];
 *
 * // With typed model
 * const { data: response } = useModelIndex<Post>('posts', {
 *   filters: { status: 'published' },
 *   includes: ['author', 'comments'],
 *   sort: '-created_at',
 *   page: 1,
 *   perPage: 20
 * });
 * const posts = response?.data || []; // Post[]
 */
export function useModelIndex<T = Record<string, any>>(model: string, options: ModelQueryOptions = {}) {
  const organization = useOrganization();

  return useQuery<QueryResponse<T>>({
    queryKey: ['modelIndex', model, organization, options],
    queryFn: async () => {
      const url = buildQueryUrl(model, organization!, options);
      const response = await api.get(url);
      const pagination = extractPaginationFromHeaders(response);

      return {
        data: response.data as T[],
        pagination,
      };
    },
    enabled: !!organization,
  });
}

/**
 * Hook to fetch a single model (show)
 *
 * @example
 * // Simple usage
 * useModelShow('users', 1)
 *
 * // With typed model
 * useModelShow<Post>('posts', 1, {
 *   includes: ['author', 'comments'],
 *   fields: ['id', 'title', 'content']
 * })
 */
export function useModelShow<T = Record<string, any>>(model: string, id: string | number | null | undefined, options: ModelQueryOptions = {}) {
  const organization = useOrganization();

  return useQuery<T>({
    queryKey: ['modelShow', model, id, organization, options],
    queryFn: async () => {
      const orgSlug = String(organization).trim();
      if (!orgSlug) {
        throw new Error('Organization slug is required. Please ensure you are logged in and have selected an organization.');
      }

      const params = new URLSearchParams();
      if (options.includes && options.includes.length > 0) {
        params.append('include', Array.isArray(options.includes) ? options.includes.join(',') : options.includes);
      }
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          params.append(`filter[${key}]`, value);
        });
      }
      if (options.sort) {
        params.append('sort', options.sort);
      }
      if (options.fields && options.fields.length > 0) {
        params.append('fields', Array.isArray(options.fields) ? options.fields.join(',') : options.fields);
      }

      const queryString = params.toString();
      const finalUrl = queryString
        ? `/${orgSlug}/${model}/${id}?${queryString}`
        : `/${orgSlug}/${model}/${id}`;

      const response = await api.get(finalUrl);
      return response.data as T;
    },
    enabled: !!organization && !!id && !!String(organization).trim(),
  });
}

/**
 * Hook to update a model
 *
 * @example
 * const updatePost = useModelUpdate<Post>('posts');
 * updatePost.mutate({ id: 1, data: { title: 'Updated' } });
 */
export function useModelUpdate<T = Record<string, any>>(model: string) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, { id: string | number; data: Partial<T> }>({
    mutationFn: ({ id, data }) => {
      const url = `/${organization}/${model}/${id}`;
      return api.put(url, data).then((res: AxiosResponse) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelIndex', model] });
      queryClient.invalidateQueries({ queryKey: ['modelShow', model] });
    },
  });
}

/**
 * Hook to delete a model
 *
 * @example
 * const deletePost = useModelDelete<Post>('posts');
 * deletePost.mutate(postId);
 */
export function useModelDelete<T = Record<string, any>>(model: string) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number>({
    mutationFn: (id) => {
      const url = `/${organization}/${model}/${id}`;
      return api.delete(url).then((res: AxiosResponse) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelIndex', model] });
      queryClient.invalidateQueries({ queryKey: ['modelShow', model] });
    },
  });
}

/**
 * Hook to create a new model
 *
 * @example
 * const createUser = useModelStore<User>('users');
 * createUser.mutate({ name: 'John Doe', email: 'john@example.com' });
 */
export function useModelStore<T = Record<string, any>>(model: string) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, Partial<T>>({
    mutationFn: (data) => {
      const url = `/${organization}/${model}`;
      return api.post(url, data).then((res: AxiosResponse) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelIndex', model] });
      queryClient.invalidateQueries({ queryKey: ['modelShow', model] });
    },
  });
}

/**
 * Hook to fetch soft-deleted (trashed) models
 *
 * @example
 * const { data: response } = useModelTrashed<Post>('posts', {
 *   search: 'deleted',
 *   page: 1,
 *   perPage: 20,
 *   sort: '-deleted_at'
 * });
 * const trashedPosts = response?.data || []; // Post[]
 */
export function useModelTrashed<T = Record<string, any>>(model: string, options: ModelQueryOptions = {}) {
  const organization = useOrganization();

  return useQuery<QueryResponse<T>>({
    queryKey: ['modelTrashed', model, organization, options],
    queryFn: async () => {
      const orgSlug = String(organization).trim();
      let url = `/${orgSlug}/${model}/trashed`;
      const params = new URLSearchParams();

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          params.append(`filter[${key}]`, value);
        });
      }
      if (options.includes && options.includes.length > 0) {
        params.append('include', options.includes.join(','));
      }
      if (options.sort) {
        params.append('sort', options.sort);
      }
      if (options.fields && options.fields.length > 0) {
        params.append('fields', options.fields.join(','));
      }
      if (options.search) {
        params.append('search', options.search);
      }
      if (options.page) {
        params.append('page', String(options.page));
      }
      if (options.perPage || options.per_page) {
        params.append('per_page', String(options.perPage || options.per_page));
      }

      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const response = await api.get(finalUrl);
      const pagination = extractPaginationFromHeaders(response);

      return {
        data: response.data as T[],
        pagination,
      };
    },
    enabled: !!organization,
  });
}

/**
 * Hook to restore a soft-deleted model
 *
 * @example
 * const restoreUser = useModelRestore<User>('users');
 * restoreUser.mutate(userId);
 */
export function useModelRestore<T = Record<string, any>>(model: string) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number>({
    mutationFn: (id) => {
      const url = `/${organization}/${model}/${id}/restore`;
      return api.post(url).then((res: AxiosResponse) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelIndex', model] });
      queryClient.invalidateQueries({ queryKey: ['modelTrashed', model] });
      queryClient.invalidateQueries({ queryKey: ['modelShow', model] });
    },
  });
}

/**
 * Hook to permanently delete a model (force delete)
 *
 * @example
 * const forceDeleteUser = useModelForceDelete<User>('users');
 * forceDeleteUser.mutate(userId);
 */
export function useModelForceDelete<T = Record<string, any>>(model: string) {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<T, Error, string | number>({
    mutationFn: (id) => {
      const url = `/${organization}/${model}/${id}/force-delete`;
      return api.delete(url).then((res: AxiosResponse) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelTrashed', model] });
    },
  });
}

/**
 * Hook to perform nested operations (multi-model transactions)
 *
 * @example
 * const nestedOps = useNestedOperations();
 * nestedOps.mutate({
 *   operations: [
 *     { action: 'create', model: 'blogs', data: { title: 'My Blog' } },
 *     { action: 'update', model: 'posts', id: 1, data: { title: 'Updated' } },
 *     { action: 'create', model: 'posts', data: { title: 'New Post', blog_id: '$0.id' } }
 *   ]
 * });
 */
export function useNestedOperations() {
  const organization = useOrganization();
  const queryClient = useQueryClient();

  if (!organization) {
    throw new Error('Organization slug is required. All routes must include organization in the URL (e.g., /org-slug/dashboard)');
  }

  return useMutation<any[], Error, { operations: NestedOperation[] }>({
    mutationFn: ({ operations }) => {
      const url = `/${organization}/nested-operations`;
      return api.post(url, { operations }).then((res: AxiosResponse) => res.data);
    },
    onSuccess: (_data, variables) => {
      const affectedModels = new Set(
        variables.operations.map(op => op.model)
      );

      affectedModels.forEach(model => {
        queryClient.invalidateQueries({ queryKey: ['modelIndex', model] });
        queryClient.invalidateQueries({ queryKey: ['modelShow', model] });
      });
    },
  });
}

/**
 * Hook to fetch audit logs for a model instance
 *
 * @example
 * const { data: response } = useModelAudit('users', 1, { page: 1, perPage: 50 });
 * const auditLogs = response?.data || []; // AuditLog[]
 */
export function useModelAudit(model: string, id: string | number | null | undefined, options: ModelQueryOptions = {}) {
  const organization = useOrganization();

  return useQuery<QueryResponse<AuditLog>>({
    queryKey: ['modelAudit', model, id, organization, options],
    queryFn: async () => {
      const orgSlug = String(organization).trim();
      let url = `/${orgSlug}/${model}/${id}/audit`;
      const params = new URLSearchParams();

      if (options.page) {
        params.append('page', String(options.page));
      }
      if (options.perPage || options.per_page) {
        params.append('per_page', String(options.perPage || options.per_page));
      }

      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const response = await api.get(finalUrl);
      const pagination = extractPaginationFromHeaders(response);

      return {
        data: response.data as AuditLog[],
        pagination,
      };
    },
    enabled: !!organization && !!id,
  });
}
