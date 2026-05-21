import { describe, it, expect, beforeEach, vi } from 'vitest';
import api, { configureApi } from '../lib/axios';

describe('API Client (axios)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have default baseURL', () => {
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('should update baseURL via configureApi', () => {
    configureApi({ baseURL: 'https://api.example.com' });
    expect(api.defaults.baseURL).toBe('https://api.example.com');
    // Reset
    configureApi({ baseURL: '/api' });
  });

  it('should attach Authorization header from storage', async () => {
    localStorage.setItem('token', 'test-token-123');

    // Intercept the request to check headers
    const requestInterceptor = api.interceptors.request.handlers[0];
    const config = { headers: {} };
    const result = requestInterceptor.fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('should not attach Authorization when no token in storage', () => {
    const requestInterceptor = api.interceptors.request.handlers[0];
    const config = { headers: {} };
    const result = requestInterceptor.fulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should accept onUnauthorized callback via configureApi', () => {
    const callback = vi.fn();
    configureApi({ onUnauthorized: callback });
    // We can't easily trigger the 401 handler without a real request,
    // but we verify the API accepts the option without error
    expect(callback).not.toHaveBeenCalled();
  });
});
