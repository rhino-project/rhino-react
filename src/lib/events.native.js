/**
 * Event emitter for React Native (in-memory).
 * Metro bundler automatically picks this file over events.js on React Native.
 * No cross-tab concept on mobile — events are dispatched within the same process.
 */

const listeners = {};

/**
 * Create a React Native event emitter using an in-memory listener registry.
 * @returns {{ emit: (key: string, value: string|null) => void, subscribe: (key: string, callback: Function) => Function }}
 */
export function createNativeEvents() {
  return {
    emit: (key, value) => {
      const keyListeners = listeners[key];
      if (keyListeners) {
        keyListeners.forEach((cb) => cb(value));
      }
    },
    subscribe: (key, callback) => {
      if (!listeners[key]) {
        listeners[key] = new Set();
      }
      listeners[key].add(callback);
      return () => {
        listeners[key].delete(callback);
        if (listeners[key].size === 0) {
          delete listeners[key];
        }
      };
    },
  };
}

/** Default events instance for React Native */
export const events = createNativeEvents();

// Re-export createNativeEvents as createWebEvents for import compatibility
export { createNativeEvents as createWebEvents };
