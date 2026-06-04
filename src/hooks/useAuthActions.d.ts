import { UseMutationResult } from '@tanstack/react-query';

export interface RegisterPayload {
  token: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  /** Per-call route group override (defaults to the configured group) */
  routeGroup?: string | null;
}

export interface PasswordRecoverPayload {
  email: string;
  /** Per-call route group override (defaults to the configured group) */
  routeGroup?: string | null;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
  /** Per-call route group override (defaults to the configured group) */
  routeGroup?: string | null;
}

export function useRegister(): UseMutationResult<any, Error, RegisterPayload>;
export function usePasswordRecover(): UseMutationResult<any, Error, PasswordRecoverPayload>;
export function useResetPassword(): UseMutationResult<any, Error, ResetPasswordPayload>;
