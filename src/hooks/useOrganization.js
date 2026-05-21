import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { events } from '../lib/events';

/**
 * Gets organization slug from storage.
 * Listens for changes via the events adapter (cross-tab on web, in-memory on native).
 * @returns {string|null} Organization slug if present, null otherwise
 *
 * @example
 * // storage has 'organization_slug' = 'my-org' -> returns 'my-org'
 * // storage doesn't have 'organization_slug' -> returns null
 */
export function useOrganization() {
  const [organization, setOrganization] = useState(() => {
    return storage.getItem('organization_slug');
  });

  useEffect(() => {
    const unsubscribe = events.subscribe('organization_slug', (newValue) => {
      setOrganization(newValue);
    });

    return unsubscribe;
  }, []);

  return organization;
}

/**
 * Sets the organization slug in storage and notifies listeners.
 * @param {string} slug - Organization slug to set
 */
export function setOrganization(slug) {
  if (slug) {
    storage.setItem('organization_slug', slug);
  } else {
    storage.removeItem('organization_slug');
  }
  events.emit('organization_slug', slug);
}
