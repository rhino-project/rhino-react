import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSecureStore, registerRhinoSecureStorage } from '../electron/main';

// A fake `safeStorage` that "encrypts" by prefixing — enough to prove the
// encrypt → persist → decrypt round-trip without an OS keychain.
function fakeSafeStorage({ available = true } = {}) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from('enc:' + s, 'utf8'),
    decryptString: (buf) => buf.toString('utf8').replace(/^enc:/, ''),
  };
}

// In-memory fs with just the calls createSecureStore needs.
function fakeFs() {
  const files = {};
  return {
    files,
    readFileSync: (p) => {
      if (!(p in files)) {
        const err = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      }
      return files[p];
    },
    writeFileSync: (p, data) => {
      files[p] = Buffer.from(data);
    },
  };
}

describe('createSecureStore', () => {
  let fs;
  const filePath = '/data/rhino-secure-store.json';

  beforeEach(() => {
    fs = fakeFs();
  });

  it('round-trips values and persists them encrypted', () => {
    const store = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    store.set('token', 't0ken');

    // File on disk is an encrypted envelope, not the plaintext token.
    const env = JSON.parse(fs.files[filePath].toString('utf8'));
    expect(env.enc).toBe(true);
    expect(typeof env.blob).toBe('string');
    expect(fs.files[filePath].toString('utf8')).not.toContain('t0ken');

    expect(store.get('token')).toBe('t0ken');
  });

  it('persists across store instances (reads back from disk)', () => {
    const a = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    a.set('token', 'persisted');
    a.set('user', '{"id":1}');

    const b = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    expect(b.get('token')).toBe('persisted');
    expect(b.get('user')).toBe('{"id":1}');
  });

  it('getMany returns only existing keys', () => {
    const store = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    store.set('token', 't');
    store.set('organization_slug', 'acme');
    expect(store.getMany(['token', 'organization_slug', 'missing'])).toEqual({
      token: 't',
      organization_slug: 'acme',
    });
  });

  it('remove and clear work', () => {
    const store = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    store.set('token', 't');
    store.set('user', 'u');
    store.remove('token');
    expect(store.get('token')).toBeNull();
    expect(store.get('user')).toBe('u');
    store.clear();
    expect(store.all()).toEqual({});
  });

  it('returns null for missing keys with no file present', () => {
    const store = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    expect(store.get('token')).toBeNull();
    expect(store.all()).toEqual({});
  });

  it('falls back to plaintext (with a warning) when encryption is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createSecureStore({
      safeStorage: fakeSafeStorage({ available: false }),
      fs,
      filePath,
    });
    store.set('token', 'plain');
    const env = JSON.parse(fs.files[filePath].toString('utf8'));
    expect(env.enc).toBe(false);
    expect(env.data.token).toBe('plain');
    expect(store.get('token')).toBe('plain');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('refuses plaintext when allowPlaintextFallback is false', () => {
    const store = createSecureStore({
      safeStorage: fakeSafeStorage({ available: false }),
      fs,
      filePath,
      allowPlaintextFallback: false,
    });
    expect(() => store.set('token', 'x')).toThrow(/refusing to persist/i);
  });

  it('recovers from a corrupt store file instead of throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fs.files[filePath] = Buffer.from('}{ not json');
    const store = createSecureStore({ safeStorage: fakeSafeStorage(), fs, filePath });
    expect(store.get('token')).toBeNull();
    store.set('token', 'recovered');
    expect(store.get('token')).toBe('recovered');
    warn.mockRestore();
  });

  it('validates required deps', () => {
    expect(() => createSecureStore({ fs, filePath })).toThrow(/safeStorage/);
    expect(() => createSecureStore({ safeStorage: fakeSafeStorage(), filePath })).toThrow(/fs/);
    expect(() => createSecureStore({ safeStorage: fakeSafeStorage(), fs })).toThrow(/filePath/);
  });
});

describe('registerRhinoSecureStorage', () => {
  function fakeIpcMain() {
    const handlers = {};
    return {
      handlers,
      handle: (ch, fn) => {
        handlers[ch] = fn;
      },
      removeHandler: (ch) => {
        delete handlers[ch];
      },
    };
  }

  it('registers handlers and derives the path from app + path', () => {
    const ipcMain = fakeIpcMain();
    const fs = fakeFs();
    const app = { getPath: (k) => `/userData/${k}` };
    const path = { join: (...parts) => parts.join('/') };

    const { store, unregister } = registerRhinoSecureStorage({
      ipcMain,
      safeStorage: fakeSafeStorage(),
      app,
      fs,
      path,
    });

    expect(Object.keys(ipcMain.handlers).sort()).toEqual(
      ['rhino:storage:clear', 'rhino:storage:get', 'rhino:storage:getMany', 'rhino:storage:remove', 'rhino:storage:set'].sort()
    );

    // IPC set → get round-trip through the registered handlers.
    expect(ipcMain.handlers['rhino:storage:set'](null, 'token', 'viaIpc')).toBe(true);
    expect(ipcMain.handlers['rhino:storage:get'](null, 'token')).toBe('viaIpc');
    expect(store.get('token')).toBe('viaIpc');

    // File landed at the derived userData path.
    expect(fs.files['/userData/userData/rhino-secure-store.json']).toBeDefined();

    unregister();
    expect(Object.keys(ipcMain.handlers)).toHaveLength(0);
  });

  it('honors a custom channel and explicit filePath', () => {
    const ipcMain = fakeIpcMain();
    const fs = fakeFs();
    registerRhinoSecureStorage({
      ipcMain,
      safeStorage: fakeSafeStorage(),
      fs,
      filePath: '/custom/store.json',
      channel: 'myapp:store',
    });
    expect(ipcMain.handlers['myapp:store:get']).toBeTypeOf('function');
    ipcMain.handlers['myapp:store:set'](null, 'k', 'v');
    expect(fs.files['/custom/store.json']).toBeDefined();
  });

  it('rejects non-string keys over IPC', () => {
    const ipcMain = fakeIpcMain();
    const fs = fakeFs();
    registerRhinoSecureStorage({ ipcMain, safeStorage: fakeSafeStorage(), fs, filePath: '/s.json' });
    expect(() => ipcMain.handlers['rhino:storage:get'](null, 123)).toThrow(/must be a string/);
  });

  it('throws without ipcMain', () => {
    expect(() => registerRhinoSecureStorage({ safeStorage: fakeSafeStorage(), fs: fakeFs(), filePath: '/s.json' })).toThrow(/ipcMain/);
  });
});
