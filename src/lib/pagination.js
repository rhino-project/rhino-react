/**
 * Extract pagination metadata from response headers
 * @param {Object} response - Axios response object
 * @returns {Object|null} Pagination metadata or null if not paginated
 *
 * @example
 * const response = await api.get('/api/users?page=2');
 * const pagination = extractPaginationFromHeaders(response);
 * // { currentPage: 2, lastPage: 10, perPage: 15, total: 150 }
 */
export function extractPaginationFromHeaders(response) {
  const currentPage = response.headers['x-current-page'];
  const lastPage = response.headers['x-last-page'];
  const perPage = response.headers['x-per-page'];
  const total = response.headers['x-total'];

  // If no pagination headers, return null
  if (!currentPage && !lastPage && !perPage && !total) {
    return null;
  }

  return {
    currentPage: parseInt(currentPage, 10) || 1,
    lastPage: parseInt(lastPage, 10) || 1,
    perPage: parseInt(perPage, 10) || 15,
    total: parseInt(total, 10) || 0,
  };
}
