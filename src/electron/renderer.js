/**
 * Electron RENDERER storage adapter for @rhino-dev/rhino-react.
 *
 * Runs in the (Chromium) renderer. It mirrors the React Native adapter: the
 * Rhino library expects a *synchronous* storage API, but the secure store lives
 * in the main process and is reached asynchronously over IPC. So we keep an
 * in-memory cache, hydrate it once via `initElectronStorage()`, serve reads
 * synchronously from the cache, and write through to the main process.
 *
 *   import { configureApi } from '@rhino-dev/rhino-react';
 *   import { createElectronStorage, initElectronStorage } from '@rhino-dev/rhino-react/electron/renderer';
 *
 *   await initElectronStorage();                       // hydrate cache (e.g. at boot)
 *   configureApi({ baseURL, storage: createElectronStorage() });
 */

const DEFAULT_KEYS = ['token', 'user', 'organization_slug', 'last_organization'];
const DEFAULT_API_KEY = 'rhino';

const cache = {};
let defaultApiKey = DEFAULT_API_KEY;

function getBridge(apiKey) {
  const g = typeof globalThis !== 'undefined' ? globalThis : undefined;
  const ns = g && g[apiKey];
  return ns && ns.storage ? ns.storage : null;
}

/**
 * Hydrate the in-memory cache from the main-process secure store. Call once at
 * app startup, before rendering / configuring the API.
 *
 * @param {Object} [options]
 * @param {string[]} [options.keys] - Keys to preload (defaults to Rhino's token/user/org keys).
 * @param {string} [options.apiKey='rhino'] - Must match the preload's `apiKey`.
 * @returns {Promise<void>}
 */
export async function initElectronStorage(options = {}) {
  const { keys = DEFAULT_KEYS, apiKey = DEFAULT_API_KEY } = options;
  defaultApiKey = apiKey;
  const bridge = getBridge(apiKey);
  if (!bridge) {
    throw new Error(
      `Rhino: window.${apiKey}.storage was not found. Call exposeRhinoStorage() ` +
        'in your Electron preload and make sure the preload is loaded.'
    );
  }
  const entries = (await bridge.getMany(keys)) || {};
  for (const key of Object.keys(entries)) {
    if (entries[key] != null) cache[key] = entries[key];
  }
}

/**
 * Create a synchronous storage adapter backed by the main-process secure store.
 * Pass the result to `configureApi({ storage })`.
 *
 * @param {Object} [options]
 * @param {string} [options.apiKey] - Must match the preload's `apiKey` (defaults to the
 *   value passed to `initElectronStorage`, else `'rhino'`).
 * @returns {{ getItem:(k:string)=>string|null, setItem:(k:string,v:string)=>void, removeItem:(k:string)=>void }}
 */
export function createElectronStorage(options = {}) {
  const apiKey = options.apiKey || defaultApiKey;
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null),
    setItem: (key, value) => {
      const str = String(value);
      cache[key] = str;
      const bridge = getBridge(apiKey);
      if (bridge) {
        Promise.resolve(bridge.set(key, str)).catch((err) =>
          console.warn('Rhino: secure storage set failed:', err)
        );
      }
    },
    removeItem: (key) => {
      delete cache[key];
      const bridge = getBridge(apiKey);
      if (bridge) {
        Promise.resolve(bridge.remove(key)).catch((err) =>
          console.warn('Rhino: secure storage remove failed:', err)
        );
      }
    },
  };
}

/** Test/advanced helper: clear the in-memory cache (does not touch the main store). */
export function _resetElectronStorageCache() {
  for (const key of Object.keys(cache)) delete cache[key];
  defaultApiKey = DEFAULT_API_KEY;
}
