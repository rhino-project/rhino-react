import { describe, it, expect } from 'vitest';
import { exposeRhinoStorage } from '../electron/preload';

function fakeContextBridge() {
  const exposed = {};
  return {
    exposed,
    exposeInMainWorld: (key, api) => {
      exposed[key] = api;
    },
  };
}

function fakeIpcRenderer() {
  const calls = [];
  return {
    calls,
    invoke: (...args) => {
      calls.push(args);
      return Promise.resolve('ok');
    },
  };
}

describe('exposeRhinoStorage (preload)', () => {
  it('exposes window.rhino.storage with the expected async API', async () => {
    const contextBridge = fakeContextBridge();
    const ipcRenderer = fakeIpcRenderer();
    exposeRhinoStorage({ contextBridge, ipcRenderer });

    const bridge = contextBridge.exposed.rhino.storage;
    expect(bridge.get).toBeTypeOf('function');
    expect(bridge.set).toBeTypeOf('function');
    expect(bridge.remove).toBeTypeOf('function');
    expect(bridge.getMany).toBeTypeOf('function');
    expect(bridge.clear).toBeTypeOf('function');

    await bridge.get('token');
    await bridge.set('token', 'v');
    await bridge.getMany(['token', 'user']);
    expect(ipcRenderer.calls).toEqual([
      ['rhino:storage:get', 'token'],
      ['rhino:storage:set', 'token', 'v'],
      ['rhino:storage:getMany', ['token', 'user']],
    ]);
  });

  it('honors custom channel and apiKey', () => {
    const contextBridge = fakeContextBridge();
    const ipcRenderer = fakeIpcRenderer();
    exposeRhinoStorage({ contextBridge, ipcRenderer, channel: 'app:kv', apiKey: 'myapp' });

    expect(contextBridge.exposed.myapp).toBeDefined();
    contextBridge.exposed.myapp.storage.remove('token');
    expect(ipcRenderer.calls[0]).toEqual(['app:kv:remove', 'token']);
  });

  it('throws when primitives are missing', () => {
    expect(() => exposeRhinoStorage({ ipcRenderer: fakeIpcRenderer() })).toThrow(/contextBridge/);
    expect(() => exposeRhinoStorage({ contextBridge: fakeContextBridge() })).toThrow(/ipcRenderer/);
  });
});
