import axios from 'axios';
import { storage } from './storage';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Required for Sanctum cookie-based auth
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

let onUnauthorized = null;

/**
 * Configure the API client base URL and behavior.
 * Call this early in your app (e.g., in main.tsx) before making any API calls.
 *
 * @param {Object} options
 * @param {string} [options.baseURL] - API base URL
 * @param {Function} [options.onUnauthorized] - Callback when a 401 response is received.
 *   Defaults to redirecting to '/' on web. React Native apps should pass their own navigation logic.
 *
 * @example
 * // Web
 * configureApi({ baseURL: import.meta.env.VITE_API_URL });
 *
 * // React Native
 * configureApi({
 *   baseURL: 'https://api.example.com/api',
 *   onUnauthorized: () => navigation.navigate('Login'),
 * });
 */
export function configureApi(options = {}) {
  if (options.baseURL) {
    api.defaults.baseURL = options.baseURL;
  }
  if (options.onUnauthorized) {
    onUnauthorized = options.onUnauthorized;
  }
}

// Request interceptor to attach token from storage
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS errors
    if (!error.response && error.message && error.message.includes('CORS')) {
      console.error('CORS Error: Make sure the Laravel backend CORS config includes your frontend URL');
      return Promise.reject(new Error('CORS Error: Backend is not allowing requests from this origin. Please check Laravel CORS configuration.'));
    }

    if (error.response?.status === 401) {
      // Clear token
      storage.removeItem('token');
      // Call custom handler or default web redirect
      if (onUnauthorized) {
        onUnauthorized();
      } else if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
