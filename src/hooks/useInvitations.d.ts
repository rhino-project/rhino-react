import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

export function useInvitations(status?: string): UseQueryResult<any[], Error>;
export function useInviteUser(): UseMutationResult<any, Error, { email: string; role_id: number }>;
export function useResendInvitation(): UseMutationResult<any, Error, string | number>;
export function useCancelInvitation(): UseMutationResult<any, Error, string | number>;
export function useAcceptInvitation(): UseMutationResult<any, Error, string>;
