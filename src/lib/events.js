/**
 * Event emitter for web (window StorageEvent).
 * On React Native, Metro bundler will resolve events.native.js instead.
 */

/**
 * Create a web event emitter using window storage events.
 * Supports cross-tab synchronization via StorageEvent.
 * @returns {{ emit: (key: string, value: string|null) => void, subscribe: (key: string, callback: Function) => Function }}
 */
export function createWebEvents() {
  return {
    emit: (key, value) => {
      window.dispatchEvent(
        new StorageEvent('storage', { key, newValue: value })
      );
    },
    subscribe: (key, callback) => {
      const handler = (e) => {
        if (e.key === key) {
          callback(e.newValue);
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };
}

/** Default events instance for web */
export const events = createWebEvents();
