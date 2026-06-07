/**
 * Electron MAIN-process helpers for @rhino-dev/rhino-react.
 *
 * Import this from your Electron main process:
 *   import { registerRhinoSecureStorage } from '@rhino-dev/rhino-react/electron';
 *
 * It stores the Rhino token/user/org values encrypted at rest via Electron's
 * `safeStorage` (OS keychain), instead of leaving them in the renderer's
 * localStorage. Electron primitives are passed in (not imported here) so this
 * module carries no `electron` dependency and is fully unit-testable.
 */

const DEFAULT_CHANNEL = 'rhino:storage';
const STORE_VERSION = 1;

/**
 * Create a secure key/value store persisted to a single encrypted file.
 *
 * @param {Object} deps
 * @param {{ encryptString: Function, decryptString: Function, isEncryptionAvailable?: Function }} deps.safeStorage - Electron's `safeStorage`.
 * @param {{ readFileSync: Function, writeFileSync: Function, existsSync?: Function, unlinkSync?: Function }} deps.fs - Node `fs` (or a compatible fake).
 * @param {string} deps.filePath - Absolute path to the store file.
 * @param {boolean} [deps.allowPlaintextFallback=true] - When OS encryption is unavailable
 *   (e.g. a Linux box with no keyring), persist obfuscated-but-unencrypted data and warn,
 *   rather than failing. Set false to hard-require encryption.
 * @returns {{ get:(k:string)=>string|null, set:(k:string,v:string)=>void, remove:(k:string)=>void, getMany:(keys:string[])=>Record<string,string>, all:()=>Record<string,string>, clear:()=>void }}
 */
export function createSecureStore({ safeStorage, fs, filePath, allowPlaintextFallback = true }) {
  if (!safeStorage) throw new Error('createSecureStore: `safeStorage` is required');
  if (!fs) throw new Error('createSecureStore: `fs` is required');
  if (!filePath) throw new Error('createSecureStore: `filePath` is required');

  const canEncrypt =
    typeof safeStorage.isEncryptionAvailable === 'function'
      ? !!safeStorage.isEncryptionAvailable()
      : true;

  let data = null; // lazily-loaded in-memory { key: value }
  let warnedPlaintext = false;

  function load() {
    if (data) return data;
    data = {};
    let raw;
    try {
      raw = fs.readFileSync(filePath);
    } catch {
      return data; // no file yet → empty store
    }
    try {
      const env = JSON.parse(raw.toString('utf8'));
      if (env && env.enc && typeof env.blob === 'string') {
        const decrypted = safeStorage.decryptString(Buffer.from(env.blob, 'base64'));
        data = JSON.parse(decrypted) || {};
      } else if (env && env.data && typeof env.data === 'object') {
        data = env.data;
      }
    } catch (err) {
      // Corrupt / unreadable store (e.g. keychain changed) — start clean rather
      // than crash the app; the user simply has to log in again.
      console.warn('Rhino: could not read secure store, resetting it:', err?.message || err);
      data = {};
    }
    return data;
  }

  function persist() {
    let env;
    if (canEncrypt) {
      const blob = safeStorage.encryptString(JSON.stringify(data)).toString('base64');
      env = { v: STORE_VERSION, enc: true, blob };
    } else {
      if (!allowPlaintextFallback) {
        throw new Error(
          'Rhino: OS encryption is unavailable and allowPlaintextFallback is false — refusing to persist tokens unencrypted.'
        );
      }
      if (!warnedPlaintext) {
        console.warn(
          'Rhino: OS encryption unavailable; persisting secure store WITHOUT encryption. ' +
            'Install a system keyring or set allowPlaintextFallback:false to disable this.'
        );
        warnedPlaintext = true;
      }
      env = { v: STORE_VERSION, enc: false, data };
    }
    fs.writeFileSync(filePath, JSON.stringify(env), { mode: 0o600 });
  }

  return {
    get(key) {
      const d = load();
      return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : null;
    },
    set(key, value) {
      const d = load();
      d[key] = String(value);
      persist();
    },
    remove(key) {
      const d = load();
      delete d[key];
      persist();
    },
    getMany(keys) {
      const d = load();
      const out = {};
      for (const key of keys || []) {
        if (Object.prototype.hasOwnProperty.call(d, key)) out[key] = d[key];
      }
      return out;
    },
    all() {
      return { ...load() };
    },
    clear() {
      data = {};
      persist();
    },
  };
}

/**
 * Register IPC handlers backing the renderer's secure storage bridge, persisting
 * to an encrypted file under the app's userData directory.
 *
 * Call this once in the Electron main process (after `app` is ready):
 *
 *   import { ipcMain, safeStorage, app } from 'electron';
 *   import fs from 'node:fs';
 *   import path from 'node:path';
 *   import { registerRhinoSecureStorage } from '@rhino-dev/rhino-react/electron';
 *   registerRhinoSecureStorage({ ipcMain, safeStorage, app, fs, path });
 *
 * @param {Object} deps
 * @param {{ handle: Function, removeHandler?: Function }} deps.ipcMain
 * @param {Object} deps.safeStorage - Electron's `safeStorage`.
 * @param {{ getPath: Function }} [deps.app] - Electron's `app` (used for the default file path).
 * @param {Object} deps.fs - Node `fs`.
 * @param {{ join: Function }} [deps.path] - Node `path` (required if `filePath` is not given).
 * @param {string} [deps.channel='rhino:storage'] - IPC channel prefix.
 * @param {string} [deps.filePath] - Override the store file path (defaults to userData).
 * @param {boolean} [deps.allowPlaintextFallback=true]
 * @returns {{ store: object, unregister: () => void }}
 */
export function registerRhinoSecureStorage({
  ipcMain,
  safeStorage,
  app,
  fs,
  path,
  channel = DEFAULT_CHANNEL,
  filePath,
  allowPlaintextFallback = true,
}) {
  if (!ipcMain || typeof ipcMain.handle !== 'function') {
    throw new Error('registerRhinoSecureStorage: `ipcMain` (from "electron") is required');
  }
  const resolvedPath =
    filePath ||
    (app && path
      ? path.join(app.getPath('userData'), 'rhino-secure-store.json')
      : null);
  if (!resolvedPath) {
    throw new Error(
      'registerRhinoSecureStorage: provide `filePath`, or both `app` and `path` to derive the default.'
    );
  }

  const store = createSecureStore({ safeStorage, fs, filePath: resolvedPath, allowPlaintextFallback });

  const asKey = (key) => {
    if (typeof key !== 'string') throw new Error('Rhino secure storage: key must be a string');
    return key;
  };

  ipcMain.handle(`${channel}:get`, (_e, key) => store.get(asKey(key)));
  ipcMain.handle(`${channel}:set`, (_e, key, value) => {
    store.set(asKey(key), value);
    return true;
  });
  ipcMain.handle(`${channel}:remove`, (_e, key) => {
    store.remove(asKey(key));
    return true;
  });
  ipcMain.handle(`${channel}:getMany`, (_e, keys) => store.getMany(Array.isArray(keys) ? keys : []));
  ipcMain.handle(`${channel}:clear`, () => {
    store.clear();
    return true;
  });

  const unregister = () => {
    if (typeof ipcMain.removeHandler === 'function') {
      for (const suffix of ['get', 'set', 'remove', 'getMany', 'clear']) {
        ipcMain.removeHandler(`${channel}:${suffix}`);
      }
    }
  };

  return { store, unregister };
}
