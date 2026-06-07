/**
 * Barrel exports for library utilities in @rhino-dev/rhino-react
 */

// API Client
export { default as api, configureApi, buildAuthPath, getRouteGroup, getTenancy } from './axios';

// Storage & Events adapters
export {
  storage,
  createWebStorage,
  initStorage,
  setStorageAdapter,
  getStorageAdapter,
} from './storage';
export type { StorageAdapter } from './storage';
export { events, createWebEvents } from './events';

// Utilities
export { extractPaginationFromHeaders } from './pagination';
export { cn } from './utils';

// Cogent.js Query Builder (optional)
export { Query, loadCogent } from './cogent';
