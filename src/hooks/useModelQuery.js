/**
 * @deprecated useModelQuery is deprecated. Use useModelIndex with options instead.
 * This is kept for backward compatibility but will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated):
 * useModelQuery('posts', { includes: ['author'] })
 * 
 * // New way:
 * useModelIndex('posts', { includes: ['author'] })
 */
import { useModelIndex } from './useModel';

export function useModelQuery(model, options = {}) {
  // Just wrap useModelIndex for backward compatibility
  return useModelIndex(model, options);
}
