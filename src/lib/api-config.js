/**
 * Shared, React-free configuration state written by `configureApi` and read by
 * everything that builds a URL (data hooks, `buildModelUrl`, the tenant-only
 * hooks). Kept in its own module so URL building does not depend on the axios
 * instance.
 */
export const apiConfig = {
  routeGroup: null,
  tenancy: 'path',
  routeGroupInDataPath: false,
  nestedPath: 'nested',
};

/**
 * The route-group segment to prepend to data URLs: `/{routeGroup}` when
 * `configureApi({ routeGroupInDataPath: true })` is set and a route group is
 * configured, otherwise an empty string.
 * @returns {string}
 */
export function dataPathPrefix() {
  return apiConfig.routeGroupInDataPath && apiConfig.routeGroup
    ? `/${apiConfig.routeGroup}`
    : '';
}
