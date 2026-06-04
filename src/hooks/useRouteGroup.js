import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { events } from '../lib/events';

/**
 * Gets the active route group from storage.
 * Listens for changes via the events adapter (cross-tab on web, in-memory on native).
 * @returns {string|null} Route group if present, null otherwise
 *
 * @example
 * // storage has 'route_group' = 'driver' -> returns 'driver'
 * // storage doesn't have 'route_group' -> returns null
 */
export function useRouteGroup() {
  const [routeGroup, setRouteGroupState] = useState(() => {
    return storage.getItem('route_group');
  });

  useEffect(() => {
    const unsubscribe = events.subscribe('route_group', (newValue) => {
      setRouteGroupState(newValue);
    });

    return unsubscribe;
  }, []);

  return routeGroup;
}

/**
 * Sets the route group in storage and notifies listeners.
 * @param {string|null} group - Route group to set (falsy clears it)
 */
export function setRouteGroup(group) {
  if (group) {
    storage.setItem('route_group', group);
  } else {
    storage.removeItem('route_group');
  }
  events.emit('route_group', group);
}
