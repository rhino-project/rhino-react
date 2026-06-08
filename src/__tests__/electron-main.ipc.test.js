import { describe, it, expect, beforeEach } from 'vitest';
import { registerRhinoSecureStorage } from '../electron/main';

function fakeSafeStorage({ available = true } = {}) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from('enc:' + s, 'utf8'),
    decryptString: (buf) => buf.toString('utf8').replace(/^enc:/, ''),
  };
}

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

// Exercises the remove / clear / getMany IPC handler bodies (registered but not
// previously invoked by the suite).
describe('registerRhinoSecureStorage — remove/clear/getMany handlers', () => {
  let ipcMain;
  let store;

  beforeEach(() => {
    ipcMain = fakeIpcMain();
    ({ store } = registerRhinoSecureStorage({
      ipcMain,
      safeStorage: fakeSafeStorage(),
      fs: fakeFs(),
      filePath: '/s.json',
    }));
    ipcMain.handlers['rhino:storage:set'](null, 'a', '1');
    ipcMain.handlers['rhino:storage:set'](null, 'b', '2');
  });

  it('getMany returns only the requested existing keys', () => {
    expect(ipcMain.handlers['rhino:storage:getMany'](null, ['a', 'b', 'missing'])).toEqual({
      a: '1',
      b: '2',
    });
  });

  it('getMany coerces a non-array argument to an empty selection', () => {
    expect(ipcMain.handlers['rhino:storage:getMany'](null, 'not-an-array')).toEqual({});
  });

  it('remove deletes a single key and returns true', () => {
    expect(ipcMain.handlers['rhino:storage:remove'](null, 'a')).toBe(true);
    expect(store.get('a')).toBeFalsy();
    expect(store.get('b')).toBe('2');
  });

  it('clear empties the store and returns true', () => {
    expect(ipcMain.handlers['rhino:storage:clear'](null)).toBe(true);
    expect(store.get('a')).toBeFalsy();
    expect(store.get('b')).toBeFalsy();
  });
});
