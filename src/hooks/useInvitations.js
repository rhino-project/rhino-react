import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useOrganization } from './useOrganization';

/**
 * Hook to fetch invitations for the current organization
 * @param {string} status - Optional status filter ('all', 'pending', 'accepted', 'expired', 'cancelled')
 * @returns {Object} React Query result with data, isLoading, error, refetch
 */
export function useInvitations(status = 'all') {
  const organization = useOrganization();
  
  if (!organization) {
    return {
      data: null,
      isLoading: false,
      error: new Error('Organization slug is required'),
      isError: true,
      refetch: () => Promise.resolve({ data: null }),
    };
  }
  
  const url = `/${organization}/invitations${status !== 'all' ? `?status=${status}` : ''}`;
  
  return useQuery({
    queryKey: ['invitations', organization, status],
    queryFn: () => api.get(url).then((res) => res.data),
    enabled: !!organization,
  });
}

/**
 * Hook to create a new invitation
 * @returns {Object} React Query mutation with mutate, mutateAsync, isLoading, error, isSuccess
 */
export function useInviteUser() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  
  if (!organization) {
    throw new Error('Organization slug is required');
  }
  
  return useMutation({
    mutationFn: ({ email, role_id }) => {
      const url = `/${organization}/invitations`;
      return api.post(url, { email, role_id }).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organization] });
    },
  });
}

/**
 * Hook to resend an invitation
 * @returns {Object} React Query mutation with mutate, mutateAsync, isLoading, error, isSuccess
 */
export function useResendInvitation() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  
  if (!organization) {
    throw new Error('Organization slug is required');
  }
  
  return useMutation({
    mutationFn: (id) => {
      const url = `/${organization}/invitations/${id}/resend`;
      return api.post(url).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organization] });
    },
  });
}

/**
 * Hook to cancel an invitation
 * @returns {Object} React Query mutation with mutate, mutateAsync, isLoading, error, isSuccess
 */
export function useCancelInvitation() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  
  if (!organization) {
    throw new Error('Organization slug is required');
  }
  
  return useMutation({
    mutationFn: (id) => {
      const url = `/${organization}/invitations/${id}`;
      return api.delete(url).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organization] });
    },
  });
}

/**
 * Hook to accept an invitation (public route, no organization required)
 * @returns {Object} React Query mutation with mutate, mutateAsync, isLoading, error, isSuccess
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (token) => {
      const url = '/invitations/accept';
      return api.post(url, { token }).then((res) => res.data);
    },
    onSuccess: () => {
      // Invalidate user-related queries after accepting invitation
      queryClient.invalidateQueries({ queryKey: ['modelIndex', 'users'] });
    },
  });
}
