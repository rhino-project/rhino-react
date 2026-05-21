export function useOrganizationExists(): {
  exists: boolean;
  isLoading: boolean;
  error: Error | null;
  data: boolean;
  organization: any | null;
};
