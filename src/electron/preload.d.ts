/** Async bridge exposed on `window[apiKey].storage` by the preload. */
export interface RhinoStorageBridge {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  getMany(keys: string[]): Promise<Record<string, string>>;
  clear(): Promise<boolean>;
}

export interface ExposeRhinoStorageDeps {
  /** Electron's `contextBridge`. */
  contextBridge: any;
  /** Electron's `ipcRenderer`. */
  ipcRenderer: any;
  /** IPC channel prefix (must match the main process; default `'rhino:storage'`). */
  channel?: string;
  /** Global key exposed on `window` (default `'rhino'`). */
  apiKey?: string;
}

export function exposeRhinoStorage(deps: ExposeRhinoStorageDeps): RhinoStorageBridge;
