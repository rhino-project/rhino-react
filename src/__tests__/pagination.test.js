import { describe, it, expect } from 'vitest';
import { extractPaginationFromHeaders } from '../lib/pagination';

describe('extractPaginationFromHeaders', () => {
  it('should return null when no pagination headers are present', () => {
    const response = { headers: {} };
    expect(extractPaginationFromHeaders(response)).toBeNull();
  });

  it('should return null when all pagination headers are undefined', () => {
    const response = {
      headers: {
        'x-current-page': undefined,
        'x-last-page': undefined,
        'x-per-page': undefined,
        'x-total': undefined,
      },
    };
    expect(extractPaginationFromHeaders(response)).toBeNull();
  });

  it('should extract all pagination values from valid headers', () => {
    const response = {
      headers: {
        'x-current-page': '3',
        'x-last-page': '10',
        'x-per-page': '25',
        'x-total': '250',
      },
    };
    expect(extractPaginationFromHeaders(response)).toEqual({
      currentPage: 3,
      lastPage: 10,
      perPage: 25,
      total: 250,
    });
  });

  it('should use default values when headers contain non-numeric strings', () => {
    const response = {
      headers: {
        'x-current-page': 'abc',
        'x-last-page': 'xyz',
        'x-per-page': 'bad',
        'x-total': 'nan',
      },
    };
    expect(extractPaginationFromHeaders(response)).toEqual({
      currentPage: 1,
      lastPage: 1,
      perPage: 15,
      total: 0,
    });
  });

  it('should handle partial headers with fallback defaults', () => {
    const response = {
      headers: {
        'x-current-page': '2',
        'x-total': '100',
      },
    };
    expect(extractPaginationFromHeaders(response)).toEqual({
      currentPage: 2,
      lastPage: 1,
      perPage: 15,
      total: 100,
    });
  });

  it('should parse string 0 for total correctly', () => {
    const response = {
      headers: {
        'x-current-page': '1',
        'x-last-page': '1',
        'x-per-page': '15',
        'x-total': '0',
      },
    };
    const result = extractPaginationFromHeaders(response);
    expect(result).not.toBeNull();
    expect(result.total).toBe(0);
  });

  it('should return non-null when at least one header exists', () => {
    const response = {
      headers: {
        'x-total': '50',
      },
    };
    const result = extractPaginationFromHeaders(response);
    expect(result).not.toBeNull();
    expect(result.total).toBe(50);
    expect(result.currentPage).toBe(1);
    expect(result.lastPage).toBe(1);
    expect(result.perPage).toBe(15);
  });
});
