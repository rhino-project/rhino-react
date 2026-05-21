import { UseQueryResult } from '@tanstack/react-query';

export function useOwner(slug?: string | null): UseQueryResult<any, Error>;
