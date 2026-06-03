/**
 * Normalizers for Rhino-server response bodies.
 *
 * Rhino's auto-generated CRUD endpoints follow JSON:API-ish conventions and
 * wrap responses in a `data` envelope:
 *   • List   → `{ data: T[], … }`
 *   • Show   → `{ data: T,   … }`
 *
 * Earlier versions of this library mistakenly typed the QueryResponse `data`
 * field as `T[]` while actually storing the entire axios `response.data` — i.e.
 * the whole envelope. Consumers had to dig with `result.data.data.data` to
 * reach the array.
 *
 * These helpers normalise both shapes so the public contract matches the type:
 *   • `useModelIndex().data.data` is `T[]`
 *   • `useModelShow().data`        is `T`
 *
 * Backward compatible: APIs that respond with the bare array/object (no
 * envelope) flow through unchanged.
 */

/** Return the items array, unwrapping a `{ data: [...] }` envelope if present. */
export function normalizeList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

/** Return the record, unwrapping a `{ data: {…} }` envelope if present. */
export function normalizeOne<T>(body: unknown): T {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const inner = (body as { data?: unknown }).data;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return inner as T;
    }
  }
  return body as T;
}
