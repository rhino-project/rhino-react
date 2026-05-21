import { UseQueryResult } from '@tanstack/react-query';

export function useModelQuery(model: string, options?: Record<string, any>): UseQueryResult<any[], Error>;
