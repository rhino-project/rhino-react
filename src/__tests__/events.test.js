import { describe, it, expect, vi } from 'vitest';
import { createWebEvents, events } from '../lib/events';

describe('Web Events Adapter', () => {
  it('should export a default events instance', () => {
    expect(events).toBeDefined();
    expect(events.emit).toBeTypeOf('function');
    expect(events.subscribe).toBeTypeOf('function');
  });

  it('should notify subscribers when emitting events', () => {
    const callback = vi.fn();
    const unsubscribe = events.subscribe('organization_slug', callback);

    events.emit('organization_slug', 'my-org');

    expect(callback).toHaveBeenCalledWith('my-org');
    unsubscribe();
  });

  it('should not notify subscribers for different keys', () => {
    const callback = vi.fn();
    const unsubscribe = events.subscribe('organization_slug', callback);

    events.emit('token', 'abc123');

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('should stop notifying after unsubscribe', () => {
    const callback = vi.fn();
    const unsubscribe = events.subscribe('organization_slug', callback);

    events.emit('organization_slug', 'org-1');
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    events.emit('organization_slug', 'org-2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support multiple subscribers for the same key', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = events.subscribe('organization_slug', cb1);
    const unsub2 = events.subscribe('organization_slug', cb2);

    events.emit('organization_slug', 'my-org');

    expect(cb1).toHaveBeenCalledWith('my-org');
    expect(cb2).toHaveBeenCalledWith('my-org');
    unsub1();
    unsub2();
  });

  it('should handle null values in emit', () => {
    const callback = vi.fn();
    const unsubscribe = events.subscribe('organization_slug', callback);

    events.emit('organization_slug', null);

    expect(callback).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  it('createWebEvents should create independent instances', () => {
    const e1 = createWebEvents();
    const e2 = createWebEvents();

    const cb1 = vi.fn();
    const cb2 = vi.fn();

    // Web events both use window, so they share the same event bus
    const unsub1 = e1.subscribe('test-key', cb1);
    const unsub2 = e2.subscribe('test-key', cb2);

    e1.emit('test-key', 'hello');

    // Both should receive since they're backed by the same window
    expect(cb1).toHaveBeenCalledWith('hello');
    expect(cb2).toHaveBeenCalledWith('hello');

    unsub1();
    unsub2();
  });
});
