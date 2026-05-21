import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// We need fresh module state for each describe block
let reducer, toast, useToast;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  const mod = await import('../hooks/use-toast');
  reducer = mod.reducer;
  toast = mod.toast;
  useToast = mod.useToast;
});

describe('reducer', () => {
  it('ADD_TOAST should add a toast to the beginning of the array', () => {
    const state = { toasts: [] };
    const result = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '1', title: 'Hello' },
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0]).toMatchObject({ id: '1', title: 'Hello' });
  });

  it('ADD_TOAST should enforce TOAST_LIMIT of 1', () => {
    const state = { toasts: [{ id: '1', title: 'Old' }] };
    const result = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '2', title: 'New' },
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST should merge props into matching toast', () => {
    const state = { toasts: [{ id: '1', title: 'Old', open: true }] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'New' },
    });
    expect(result.toasts[0].title).toBe('New');
    expect(result.toasts[0].open).toBe(true);
  });

  it('UPDATE_TOAST should not modify non-matching toasts', () => {
    const state = {
      toasts: [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
      ],
    };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });
    expect(result.toasts[1].title).toBe('Second');
  });

  it('DISMISS_TOAST should set open to false for matching toast', () => {
    const state = { toasts: [{ id: '1', open: true }] };
    const result = reducer(state, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    });
    expect(result.toasts[0].open).toBe(false);
  });

  it('REMOVE_TOAST should remove matching toast from array', () => {
    const state = {
      toasts: [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
      ],
    };
    const result = reducer(state, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });
});

describe('toast function', () => {
  it('should return id, dismiss, and update functions', () => {
    const result = toast({ title: 'Test' });
    expect(result.id).toBeDefined();
    expect(typeof result.dismiss).toBe('function');
    expect(typeof result.update).toBe('function');
  });

  it('should generate unique incrementing IDs', () => {
    const t1 = toast({ title: 'First' });
    const t2 = toast({ title: 'Second' });
    expect(t1.id).not.toBe(t2.id);
  });

  it('dismiss should set the toast to open false', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.toasts[0].onOpenChange(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('update should merge new props into the toast', () => {
    const { result } = renderHook(() => useToast());

    let t;
    act(() => {
      t = toast({ title: 'Old' });
    });

    act(() => {
      t.update({ title: 'New' });
    });

    expect(result.current.toasts[0].title).toBe('New');
  });
});

describe('useToast hook', () => {
  it('should return toasts array and toast and dismiss functions', () => {
    const { result } = renderHook(() => useToast());
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should update when a toast is added', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Hello' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
  });

  it('should remove toast after TOAST_REMOVE_DELAY when dismissed', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    let t;
    act(() => {
      t = toast({ title: 'Temporary' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      t.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should clean up listener on unmount', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Before unmount' });
    });

    unmount();

    // Should not throw after unmount
    expect(() => {
      toast({ title: 'After unmount' });
    }).not.toThrow();
  });
});
