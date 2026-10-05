/**
 * Barrel exports for library utilities in @rhino-dev/rhino-react
 */

// API Client
export {
  default as api,
  configureApi,
  buildAuthPath,
  getRouteGroup,
  getTenancy,
  getRouteGroupInDataPath,
} from './axios';

// URL building, query keys and plain fetchers (usable outside React)
export { buildModelUrl, modelKeys, fetchModelIndex, fetchModelShow } from './model';
export type { ModelQueryFilter } from './model';

// Storage & Events adapters
export {
  storage,
  STORAGE_KEYS,
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
