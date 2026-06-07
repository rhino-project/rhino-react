/**
 * Electron PRELOAD helper for @rhino-dev/rhino-react.
 *
 * Import this from your Electron preload script and pass in Electron's
 * `contextBridge` and `ipcRenderer`:
 *
 *   import { contextBridge, ipcRenderer } from 'electron';
 *   import { exposeRhinoStorage } from '@rhino-dev/rhino-react/electron/preload';
 *   exposeRhinoStorage({ contextBridge, ipcRenderer });
 *
 * This exposes `window.rhino.storage` (async) in the renderer, which the
 * renderer-side `createElectronStorage()` adapter consumes. Primitives are
 * injected (not imported) so this module has no `electron` dependency.
 */

const DEFAULT_CHANNEL = 'rhino:storage';
const DEFAULT_API_KEY = 'rhino';

/**
 * Expose the Rhino secure-storage bridge on `window[apiKey].storage`.
 *
 * @param {Object} deps
 * @param {{ exposeInMainWorld: Function }} deps.contextBridge - Electron's `contextBridge`.
 * @param {{ invoke: Function }} deps.ipcRenderer - Electron's `ipcRenderer`.
 * @param {string} [deps.channel='rhino:storage'] - Must match the main-process channel.
 * @param {string} [deps.apiKey='rhino'] - Global key exposed on `window`.
 * @returns {object} The bridge object that was exposed (also handy for tests).
 */
export function exposeRhinoStorage({
  contextBridge,
  ipcRenderer,
  channel = DEFAULT_CHANNEL,
  apiKey = DEFAULT_API_KEY,
}) {
  if (!contextBridge || typeof contextBridge.exposeInMainWorld !== 'function') {
    throw new Error(
      'exposeRhinoStorage: `contextBridge` (from "electron") is required'
    );
  }
  if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
    throw new Error('exposeRhinoStorage: `ipcRenderer` (from "electron") is required');
  }

  const bridge = {
    get: (key) => ipcRenderer.invoke(`${channel}:get`, key),
    set: (key, value) => ipcRenderer.invoke(`${channel}:set`, key, value),
    remove: (key) => ipcRenderer.invoke(`${channel}:remove`, key),
    getMany: (keys) => ipcRenderer.invoke(`${channel}:getMany`, keys),
    clear: () => ipcRenderer.invoke(`${channel}:clear`),
  };

  contextBridge.exposeInMainWorld(apiKey, { storage: bridge });
  return bridge;
}
