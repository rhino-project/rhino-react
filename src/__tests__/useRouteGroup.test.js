import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouteGroup, setRouteGroup } from '../hooks/useRouteGroup';

describe('useRouteGroup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no route group is stored', () => {
    const { result } = renderHook(() => useRouteGroup());
    expect(result.current).toBeNull();
  });

  it('initializes from storage on mount', () => {
    localStorage.setItem('route_group', 'driver');
    const { result } = renderHook(() => useRouteGroup());
    expect(result.current).toBe('driver');
  });

  it('reflects setRouteGroup across multiple hook instances (events pub/sub)', () => {
    const { result: r1 } = renderHook(() => useRouteGroup());
    const { result: r2 } = renderHook(() => useRouteGroup());

    expect(r1.current).toBeNull();
    expect(r2.current).toBeNull();

    act(() => {
      setRouteGroup('admin');
    });

    expect(r1.current).toBe('admin');
    expect(r2.current).toBe('admin');
    expect(localStorage.getItem('route_group')).toBe('admin');
  });

  it('clears the route group when set to a falsy value', () => {
    localStorage.setItem('route_group', 'driver');
    const { result } = renderHook(() => useRouteGroup());
    expect(result.current).toBe('driver');

    act(() => {
      setRouteGroup(null);
    });

    expect(result.current).toBeNull();
    expect(localStorage.getItem('route_group')).toBeNull();
  });

  it('unsubscribes from events on unmount', () => {
    const { result, unmount } = renderHook(() => useRouteGroup());

    act(() => {
      setRouteGroup('before');
    });
    expect(result.current).toBe('before');

    unmount();

    act(() => {
      setRouteGroup('after');
    });
    // Unmounted hook keeps its last value
    expect(result.current).toBe('before');
  });
});
