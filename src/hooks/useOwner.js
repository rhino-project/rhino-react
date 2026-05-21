import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useOrganization } from './useOrganization';

/**
 * Hook to fetch the current organization/owner
 * @param {string|null} slug - Optional organization slug. If not provided, uses slug from current URL
 * @returns {Object} React Query result with organization data, isLoading, error
 */
export function useOwner(slug = null) {
  const organizationFromUrl = useOrganization();
  const targetSlug = slug || organizationFromUrl;
  
  // If no slug available, return a disabled query result
  if (!targetSlug) {
    return {
      data: null,
      isLoading: false,
      error: null,
      isError: false,
      refetch: () => Promise.resolve({ data: null }),
    };
  }
  
  // Build the URL manually: /{organization}/organizations?filter[slug]={slug}&include=users,users.role
  // Organization is already in the URL path, no need to add as query parameter
  const url = `/${targetSlug}/organizations?filter[slug]=${encodeURIComponent(targetSlug)}&include=users`;
  
  return useQuery({
    queryKey: ['owner', targetSlug],
    queryFn: async () => {
      const response = await api.get(url);
      const data = response.data;
      
      // If it's an array, return the first matching organization
      if (Array.isArray(data)) {
        const org = data.find(o => o.slug === targetSlug);
        return org || (data.length > 0 ? data[0] : null);
      }
      
      // If it's a single object
      return data;
    },
    enabled: !!targetSlug,
  });
}
