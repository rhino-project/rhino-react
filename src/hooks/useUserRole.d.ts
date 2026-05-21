export function useUserRole(): {
  roles: any[];
  roleIds: number[];
  isLoading: boolean;
  hasRole: (name: string) => boolean;
};
