/** A synchronous secure key/value store persisted to an encrypted file. */
export interface SecureStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  getMany(keys: string[]): Record<string, string>;
  all(): Record<string, string>;
  clear(): void;
}

export interface CreateSecureStoreDeps {
  /** Electron's `safeStorage`. */
  safeStorage: any;
  /** Node `fs` (or a compatible fake). */
  fs: any;
  /** Absolute path to the store file. */
  filePath: string;
  /** Persist obfuscated-but-unencrypted when OS encryption is unavailable (default true). */
  allowPlaintextFallback?: boolean;
}

export function createSecureStore(deps: CreateSecureStoreDeps): SecureStore;

export interface RegisterRhinoSecureStorageDeps {
  /** Electron's `ipcMain`. */
  ipcMain: any;
  /** Electron's `safeStorage`. */
  safeStorage: any;
  /** Electron's `app` (used to derive the default file path under userData). */
  app?: any;
  /** Node `fs`. */
  fs: any;
  /** Node `path` (required if `filePath` is omitted). */
  path?: any;
  /** IPC channel prefix (default `'rhino:storage'`). */
  channel?: string;
  /** Override the store file path. */
  filePath?: string;
  allowPlaintextFallback?: boolean;
}

export function registerRhinoSecureStorage(deps: RegisterRhinoSecureStorageDeps): {
  store: SecureStore;
  unregister: () => void;
};
