import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useOrganization } from './useOrganization';
import { useOwner } from './useOwner';
import { storage } from '../lib/storage';

/**
 * Hook to get the current user's roles in the current organization.
 * Returns roles info and a hasRole() helper for role-based UI logic.
 *
 * @returns {{ roles: object[], roleIds: number[], isLoading: boolean, hasRole: (name: string) => boolean }}
 *
 * @example
 * const { roles, hasRole, isLoading } = useUserRole();
 * if (hasRole('admin')) { ... }
 */
export function useUserRole() {
  const slug = useOrganization();
  const { data: organization, isLoading: isLoadingOrg } = useOwner();

  const { data: allRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles', slug],
    queryFn: async () => {
      const response = await api.get(`/${slug}/roles`);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!slug,
  });

  const currentUser = useMemo(() => {
    const json = storage.getItem('user');
    return json ? JSON.parse(json) : null;
  }, []);

  const roleIds = useMemo(() => {
    if (!organization?.users || !currentUser) return [];
    return organization.users
      .filter((u) => u.id === currentUser.id && u.pivot?.role_id != null)
      .map((u) => u.pivot.role_id);
  }, [organization, currentUser]);

  const roles = useMemo(() => {
    if (!allRoles || roleIds.length === 0) return [];
    return allRoles.filter((r) => roleIds.includes(r.id));
  }, [allRoles, roleIds]);

  const isLoading = isLoadingOrg || isLoadingRoles;

  const hasRole = (roleName) => {
    if (roles.length === 0) return false;
    const lower = roleName.toLowerCase();
    return roles.some(
      (r) =>
        r.name?.toLowerCase() === lower || r.slug?.toLowerCase() === lower,
    );
  };

  return { roles, roleIds, isLoading, hasRole };
}
