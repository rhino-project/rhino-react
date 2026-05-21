import { AxiosInstance } from 'axios';

export interface ConfigureApiOptions {
  baseURL?: string;
  onUnauthorized?: () => void;
}

export function configureApi(options?: ConfigureApiOptions): void;

declare const api: AxiosInstance;
export default api;
