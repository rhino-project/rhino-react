import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

export interface InviteUserPayload {
  email: string;
  role_id: number;
  /** Optional route group the invitee will join (group-aware invitations). */
  route_group?: string | null;
}

export interface AcceptInvitationPayload {
  token: string;
  /** Optional route group propagated to the backend on accept. */
  route_group?: string | null;
}

export function useInvitations(status?: string): UseQueryResult<any[], Error>;
export function useInviteUser(): UseMutationResult<any, Error, InviteUserPayload>;
export function useResendInvitation(): UseMutationResult<any, Error, string | number>;
export function useCancelInvitation(): UseMutationResult<any, Error, string | number>;
export function useAcceptInvitation(): UseMutationResult<any, Error, string | AcceptInvitationPayload>;
