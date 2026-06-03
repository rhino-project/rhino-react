import { normalizeList, normalizeOne } from '../lib/normalize-response';

describe('normalizeList', () => {
  it('returns a bare array unchanged', () => {
    expect(normalizeList([{ id: 1 }, { id: 2 }])).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('unwraps a Rhino envelope { data: T[] }', () => {
    expect(normalizeList({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('returns [] for envelopes whose data is not an array', () => {
    expect(normalizeList({ data: { id: 1 } })).toEqual([]);
  });

  it('returns [] for null / undefined / primitives', () => {
    expect(normalizeList(null)).toEqual([]);
    expect(normalizeList(undefined)).toEqual([]);
    expect(normalizeList('x')).toEqual([]);
    expect(normalizeList(42)).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(normalizeList([])).toEqual([]);
  });
});

describe('normalizeOne', () => {
  it('returns a bare object unchanged', () => {
    expect(normalizeOne({ id: 1, name: 'x' })).toEqual({ id: 1, name: 'x' });
  });

  it('unwraps a Rhino envelope { data: {...} }', () => {
    expect(normalizeOne({ data: { id: 1, name: 'x' } })).toEqual({ id: 1, name: 'x' });
  });

  it('does NOT unwrap when inner data is an array (treats body as the record)', () => {
    // e.g. a record whose first field happens to be `data: []`
    expect(normalizeOne({ data: [] })).toEqual({ data: [] });
  });

  it('returns primitives unchanged', () => {
    expect(normalizeOne(null)).toBe(null);
    expect(normalizeOne(42)).toBe(42);
  });
});
