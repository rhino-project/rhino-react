import { useOrganization } from './useOrganization';
import { useOwner } from './useOwner';

/**
 * Hook to check if the current organization exists and is valid
 * Uses useOwner which already fetches the organization
 * @returns {Object} { exists: boolean, isLoading: boolean, error: Error | null, data: Organization | null }
 */
export function useOrganizationExists() {
  const organization = useOrganization();
  const { data: orgData, isLoading, error } = useOwner();
  
  return {
    data: orgData ? true : false,
    exists: !!orgData,
    isLoading,
    error,
    organization: orgData,
  };
}
