import { describe, it, expect, vi } from 'vitest';
import { createNativeEvents } from '../lib/events.native';

describe('Native Events Adapter (in-memory)', () => {
  it('should notify subscribers when emitting events', () => {
    const emitter = createNativeEvents();
    const callback = vi.fn();
    const unsubscribe = emitter.subscribe('organization_slug', callback);

    emitter.emit('organization_slug', 'my-org');

    expect(callback).toHaveBeenCalledWith('my-org');
    unsubscribe();
  });

  it('should not notify subscribers for different keys', () => {
    const emitter = createNativeEvents();
    const callback = vi.fn();
    const unsubscribe = emitter.subscribe('organization_slug', callback);

    emitter.emit('token', 'abc123');

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('should stop notifying after unsubscribe', () => {
    const emitter = createNativeEvents();
    const callback = vi.fn();
    const unsubscribe = emitter.subscribe('organization_slug', callback);

    emitter.emit('organization_slug', 'org-1');
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    emitter.emit('organization_slug', 'org-2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support multiple subscribers for the same key', () => {
    const emitter = createNativeEvents();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = emitter.subscribe('organization_slug', cb1);
    const unsub2 = emitter.subscribe('organization_slug', cb2);

    emitter.emit('organization_slug', 'my-org');

    expect(cb1).toHaveBeenCalledWith('my-org');
    expect(cb2).toHaveBeenCalledWith('my-org');
    unsub1();
    unsub2();
  });

  it('should handle null values in emit', () => {
    const emitter = createNativeEvents();
    const callback = vi.fn();
    const unsubscribe = emitter.subscribe('organization_slug', callback);

    emitter.emit('organization_slug', null);

    expect(callback).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  it('should clean up empty listener sets', () => {
    const emitter = createNativeEvents();
    const callback = vi.fn();
    const unsubscribe = emitter.subscribe('test-key', callback);

    unsubscribe();
    // Emitting after cleanup should not throw
    emitter.emit('test-key', 'value');
    expect(callback).not.toHaveBeenCalled();
  });
});
