import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../lib/axios';

/**
 * Route every request of the REAL axios instance through a stub adapter, so a
 * test sees the final request (method, url, headers, body) after the library's
 * interceptors and axios' own request transforms have run.
 *
 * `respond(config)` returns `{ status?, data?, headers? }`; a status outside
 * 2xx rejects the way axios does.
 */
export function stubAdapter(respond = () => ({ data: [] })) {
  const requests = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    const { status = 200, data = null, headers = {} } = (await respond(config)) || {};
    const response = { data, status, statusText: '', headers, config, request: {} };
    if (status >= 200 && status < 300) return response;
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = response;
    error.isAxiosError = true;
    throw error;
  };
  return requests;
}

export function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function wrapperFor(queryClient = createClient()) {
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
}
