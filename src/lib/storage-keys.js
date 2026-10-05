/**
 * Every storage key the library reads or writes. The React Native adapter
 * hydrates exactly this list in `initStorage()`, so a key added here is
 * restored after an app restart without further changes.
 */
export const STORAGE_KEYS = [
  'token',
  'user',
  'organization_slug',
  'last_organization',
  'route_group',
];
