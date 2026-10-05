export declare const apiConfig: {
  routeGroup: string | null;
  tenancy: 'path' | 'subdomain' | 'none';
  routeGroupInDataPath: boolean;
  nestedPath: string;
};

/** `/{routeGroup}` when the route group is part of data URLs, otherwise `''`. */
export function dataPathPrefix(): string;
