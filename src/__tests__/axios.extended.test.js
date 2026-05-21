import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import api, { configureApi } from '../lib/axios';

describe('API Client – Response Interceptor', () => {
  let responseErrorHandler;

  beforeEach(() => {
    localStorage.clear();
    // Get the response error interceptor handler
    responseErrorHandler = api.interceptors.response.handlers[0].rejected;
  });

  afterEach(() => {
    // Reset the configureApi callback
    configureApi({ baseURL: '/api' });
  });

  it('should handle CORS error with descriptive message', async () => {
    const corsError = { message: 'Network Error: CORS policy blocked', response: undefined };

    await expect(responseErrorHandler(corsError)).rejects.toThrow(
      'CORS Error: Backend is not allowing requests from this origin'
    );
  });

  it('should pass through non-CORS errors without response', async () => {
    const networkError = { message: 'Network Error', response: undefined };

    await expect(responseErrorHandler(networkError)).rejects.toBe(networkError);
  });

  it('should clear token on 401 response', async () => {
    localStorage.setItem('token', 'expired-token');

    const error401 = {
      response: { status: 401 },
      message: 'Unauthorized',
    };

    // Mock window.location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '/dashboard' };

    await expect(responseErrorHandler(error401)).rejects.toBe(error401);
    expect(localStorage.getItem('token')).toBeNull();

    window.location = originalLocation;
  });

  it('should call onUnauthorized callback on 401', async () => {
    const onUnauthorized = vi.fn();
    configureApi({ onUnauthorized });

    const error401 = {
      response: { status: 401 },
      message: 'Unauthorized',
    };

    await expect(responseErrorHandler(error401)).rejects.toBe(error401);
    expect(onUnauthorized).toHaveBeenCalled();

    // Clean up
    configureApi({ onUnauthorized: null });
  });

  it('should clear token on 401 when no custom handler', async () => {
    // The onUnauthorized was set to null in the previous test cleanup
    // On web, it also tries to redirect via window.location.href
    localStorage.setItem('token', 'will-be-cleared');

    const error401 = { response: { status: 401 }, message: 'Unauthorized' };

    await expect(responseErrorHandler(error401)).rejects.toBe(error401);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should pass through 403 errors without clearing token', async () => {
    localStorage.setItem('token', 'valid-token');

    const error403 = { response: { status: 403 }, message: 'Forbidden' };

    await expect(responseErrorHandler(error403)).rejects.toBe(error403);
    expect(localStorage.getItem('token')).toBe('valid-token');
  });

  it('should pass through 404 errors', async () => {
    const error404 = { response: { status: 404 }, message: 'Not Found' };
    await expect(responseErrorHandler(error404)).rejects.toBe(error404);
  });

  it('should pass through 500 errors', async () => {
    const error500 = { response: { status: 500 }, message: 'Server Error' };
    await expect(responseErrorHandler(error500)).rejects.toBe(error500);
  });

  it('should pass through successful responses in success handler', () => {
    const successHandler = api.interceptors.response.handlers[0].fulfilled;
    const response = { data: { id: 1 }, status: 200 };
    expect(successHandler(response)).toBe(response);
  });
});

describe('API Client – Request Interceptor', () => {
  let requestHandler;
  let requestErrorHandler;

  beforeEach(() => {
    localStorage.clear();
    requestHandler = api.interceptors.request.handlers[0].fulfilled;
    requestErrorHandler = api.interceptors.request.handlers[0].rejected;
  });

  it('should attach Bearer token when present', () => {
    localStorage.setItem('token', 'my-jwt');
    const config = { headers: {} };
    const result = requestHandler(config);
    expect(result.headers.Authorization).toBe('Bearer my-jwt');
  });

  it('should not modify headers when no token', () => {
    const config = { headers: {} };
    const result = requestHandler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should preserve existing headers', () => {
    localStorage.setItem('token', 'tok');
    const config = { headers: { 'X-Custom': 'value' } };
    const result = requestHandler(config);
    expect(result.headers['X-Custom']).toBe('value');
    expect(result.headers.Authorization).toBe('Bearer tok');
  });

  it('should reject request errors', async () => {
    const error = new Error('Request setup failed');
    await expect(requestErrorHandler(error)).rejects.toThrow('Request setup failed');
  });
});

describe('API Client – Default Configuration', () => {
  it('should have withCredentials enabled', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('should have X-Requested-With header', () => {
    expect(api.defaults.headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('should have Accept application/json header', () => {
    expect(api.defaults.headers['Accept']).toBe('application/json');
  });

  it('should have Content-Type application/json header', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});

describe('configureApi', () => {
  afterEach(() => {
    configureApi({ baseURL: '/api' });
  });

  it('should not modify baseURL when not provided', () => {
    const before = api.defaults.baseURL;
    configureApi({});
    expect(api.defaults.baseURL).toBe(before);
  });

  it('should accept empty options', () => {
    expect(() => configureApi()).not.toThrow();
  });

  it('should update baseURL when provided', () => {
    configureApi({ baseURL: 'https://api.example.com/v2' });
    expect(api.defaults.baseURL).toBe('https://api.example.com/v2');
  });
});
