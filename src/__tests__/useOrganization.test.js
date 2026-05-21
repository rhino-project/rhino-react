import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrganization, setOrganization } from '../hooks/useOrganization';

describe('useOrganization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when no organization is stored', () => {
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBeNull();
  });

  it('should return stored organization slug', () => {
    localStorage.setItem('organization_slug', 'my-org');
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBe('my-org');
  });

  it('should update when setOrganization is called', () => {
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBeNull();

    act(() => {
      setOrganization('new-org');
    });

    expect(result.current).toBe('new-org');
  });

  it('should clear when setOrganization is called with null', () => {
    localStorage.setItem('organization_slug', 'my-org');
    const { result } = renderHook(() => useOrganization());
    expect(result.current).toBe('my-org');

    act(() => {
      setOrganization(null);
    });

    expect(result.current).toBeNull();
  });

  it('setOrganization should persist to storage', () => {
    setOrganization('stored-org');
    expect(localStorage.getItem('organization_slug')).toBe('stored-org');
  });

  it('setOrganization should remove from storage when null', () => {
    localStorage.setItem('organization_slug', 'my-org');
    setOrganization(null);
    expect(localStorage.getItem('organization_slug')).toBeNull();
  });
});
