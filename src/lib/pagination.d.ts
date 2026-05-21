import { AxiosResponse } from 'axios';

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export function extractPaginationFromHeaders(response: AxiosResponse): PaginationMeta | null;
