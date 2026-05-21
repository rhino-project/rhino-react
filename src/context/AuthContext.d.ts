import { ReactNode, ReactElement } from 'react';

export interface LoginResult {
  success: boolean;
  user?: any;
  organization?: any;
  organization_slug?: string;
  error?: string;
}

export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setOrganization: (slug: string | null) => void;
}

export function AuthProvider(props: { children: ReactNode }): ReactElement;
export function useAuth(): AuthContextValue;
