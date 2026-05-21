import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrganization, setOrganization } from '../hooks/useOrganization';

describe('useOrganization – cross-tab sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should update multiple hook instances when setOrganization is called', () => {
    const { result: result1 } = renderHook(() => useOrganization());
    const { result: result2 } = renderHook(() => useOrganization());

    expect(result1.current).toBeNull();
    expect(result2.current).toBeNull();

    act(() => {
      setOrganization('shared-org');
    });

    expect(result1.current).toBe('shared-org');
    expect(result2.current).toBe('shared-org');
  });

  it('should handle rapid setOrganization calls', () => {
    const { result } = renderHook(() => useOrganization());

    act(() => {
      setOrganization('org-1');
      setOrganization('org-2');
      setOrganization('org-3');
    });

    expect(result.current).toBe('org-3');
    expect(localStorage.getItem('organization_slug')).toBe('org-3');
  });

  it('should handle setOrganization with empty string', () => {
    localStorage.setItem('organization_slug', 'my-org');
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBe('my-org');

    act(() => {
      setOrganization('');
    });

    // Empty string is falsy, should be treated as clearing
    expect(localStorage.getItem('organization_slug')).toBeNull();
  });

  it('should handle setOrganization with undefined', () => {
    localStorage.setItem('organization_slug', 'my-org');

    act(() => {
      setOrganization(undefined);
    });

    expect(localStorage.getItem('organization_slug')).toBeNull();
  });

  it('should initialize from storage on mount', () => {
    localStorage.setItem('organization_slug', 'pre-set-org');
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBe('pre-set-org');
  });

  it('should handle setting same organization twice', () => {
    const { result } = renderHook(() => useOrganization());

    act(() => {
      setOrganization('org-1');
    });
    expect(result.current).toBe('org-1');

    act(() => {
      setOrganization('org-1');
    });
    expect(result.current).toBe('org-1');
  });
});

describe('useOrganization – cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should unsubscribe from events on unmount', () => {
    const { unmount, result } = renderHook(() => useOrganization());

    act(() => {
      setOrganization('org-before-unmount');
    });
    expect(result.current).toBe('org-before-unmount');

    unmount();

    // After unmount, setting org should not cause errors
    act(() => {
      setOrganization('org-after-unmount');
    });

    // The unmounted hook should not update
    // (result.current still holds the last value before unmount)
    expect(result.current).toBe('org-before-unmount');
  });
});
