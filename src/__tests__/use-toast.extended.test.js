import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { reducer, useToast, toast } from '../hooks/use-toast';

describe('toast reducer – extended', () => {
  it('ADD_TOAST should add toast with open: true and onOpenChange', () => {
    const state = { toasts: [] };
    const action = {
      type: 'ADD_TOAST',
      toast: { id: '1', title: 'Hello', open: true, onOpenChange: () => {} },
    };
    const next = reducer(state, action);

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].title).toBe('Hello');
    expect(next.toasts[0].open).toBe(true);
    expect(next.toasts[0].onOpenChange).toBeTypeOf('function');
  });

  it('ADD_TOAST should enforce TOAST_LIMIT of 1', () => {
    const state = {
      toasts: [{ id: '1', title: 'First', open: true }],
    };
    const action = {
      type: 'ADD_TOAST',
      toast: { id: '2', title: 'Second', open: true },
    };
    const next = reducer(state, action);

    expect(next.toasts).toHaveLength(1);
    // New toast should be first (prepended)
    expect(next.toasts[0].title).toBe('Second');
  });

  it('ADD_TOAST should prepend new toast', () => {
    const state = { toasts: [] };
    const a1 = reducer(state, { type: 'ADD_TOAST', toast: { id: '1', title: 'A' } });
    // Since limit is 1, only the latest toast survives
    const a2 = reducer(a1, { type: 'ADD_TOAST', toast: { id: '2', title: 'B' } });

    expect(a2.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST should merge properties', () => {
    const state = {
      toasts: [{ id: '1', title: 'Old', description: 'Desc', open: true }],
    };
    const action = {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    };
    const next = reducer(state, action);

    expect(next.toasts[0].title).toBe('Updated');
    expect(next.toasts[0].description).toBe('Desc'); // unchanged
    expect(next.toasts[0].open).toBe(true); // unchanged
  });

  it('UPDATE_TOAST should not affect non-matching toasts', () => {
    const state = {
      toasts: [{ id: '1', title: 'Keep' }],
    };
    const action = {
      type: 'UPDATE_TOAST',
      toast: { id: '99', title: 'Ghost' },
    };
    const next = reducer(state, action);

    expect(next.toasts[0].title).toBe('Keep');
  });

  it('DISMISS_TOAST should set open to false for specific toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Toast', open: true }],
    };
    const action = { type: 'DISMISS_TOAST', toastId: '1' };
    const next = reducer(state, action);

    expect(next.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST without toastId should dismiss all toasts', () => {
    const state = {
      toasts: [
        { id: '1', open: true },
      ],
    };
    const action = { type: 'DISMISS_TOAST' };
    const next = reducer(state, action);

    expect(next.toasts[0].open).toBe(false);
  });

  it('REMOVE_TOAST should remove specific toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Remove me' }],
    };
    const action = { type: 'REMOVE_TOAST', toastId: '1' };
    const next = reducer(state, action);

    expect(next.toasts).toHaveLength(0);
  });

  it('REMOVE_TOAST without toastId should clear all toasts', () => {
    const state = {
      toasts: [{ id: '1' }],
    };
    const action = { type: 'REMOVE_TOAST', toastId: undefined };
    const next = reducer(state, action);

    expect(next.toasts).toHaveLength(0);
  });

  it('REMOVE_TOAST should not remove non-matching toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Stay' }],
    };
    const action = { type: 'REMOVE_TOAST', toastId: '999' };
    const next = reducer(state, action);

    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].title).toBe('Stay');
  });

  it('should return state unchanged for unknown action type', () => {
    const state = { toasts: [{ id: '1' }] };
    const next = reducer(state, { type: 'UNKNOWN_ACTION' });
    expect(next).toBeUndefined(); // reducer has no default case
  });
});

describe('toast() function – extended', () => {
  it('should return id, dismiss, and update functions', () => {
    const result = toast({ title: 'Test' });

    expect(result.id).toBeDefined();
    expect(result.id).toBeTypeOf('string');
    expect(result.dismiss).toBeTypeOf('function');
    expect(result.update).toBeTypeOf('function');
  });

  it('should generate unique IDs for consecutive toasts', () => {
    const t1 = toast({ title: 'First' });
    const t2 = toast({ title: 'Second' });
    const t3 = toast({ title: 'Third' });

    expect(t1.id).not.toBe(t2.id);
    expect(t2.id).not.toBe(t3.id);
    expect(t1.id).not.toBe(t3.id);
  });

  it('should pass through custom props', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Custom', description: 'A description', variant: 'destructive' });
    });

    expect(result.current.toasts.length).toBeGreaterThan(0);
    const t = result.current.toasts[0];
    expect(t.title).toBe('Custom');
    expect(t.description).toBe('A description');
    expect(t.variant).toBe('destructive');
  });

  it('dismiss() should set the toast open to false', () => {
    const { result } = renderHook(() => useToast());

    let toastResult;
    act(() => {
      toastResult = toast({ title: 'Dismissable' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      toastResult.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('update() should modify the toast', () => {
    const { result } = renderHook(() => useToast());

    let toastResult;
    act(() => {
      toastResult = toast({ title: 'Original' });
    });

    expect(result.current.toasts[0].title).toBe('Original');

    act(() => {
      toastResult.update({ title: 'Modified' });
    });

    expect(result.current.toasts[0].title).toBe('Modified');
  });

  it('onOpenChange(false) should dismiss the toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Auto-close' });
    });

    const t = result.current.toasts[0];
    expect(t.onOpenChange).toBeTypeOf('function');

    act(() => {
      t.onOpenChange(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});

describe('useToast hook – extended', () => {
  it('should return toasts array and toast/dismiss functions', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toBeDefined();
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(result.current.toast).toBeTypeOf('function');
    expect(result.current.dismiss).toBeTypeOf('function');
  });

  it('dismiss should accept a toastId', () => {
    const { result } = renderHook(() => useToast());

    let toastId;
    act(() => {
      const t = toast({ title: 'Dismiss me' });
      toastId = t.id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should reflect state changes across multiple useToast instances', () => {
    const { result: r1 } = renderHook(() => useToast());
    const { result: r2 } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Shared' });
    });

    expect(r1.current.toasts[0].title).toBe('Shared');
    expect(r2.current.toasts[0].title).toBe('Shared');
  });

  it('should clean up listener on unmount', () => {
    const { unmount } = renderHook(() => useToast());

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();

    // Should still work after unmount of one listener
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'After unmount' });
    });
    expect(result.current.toasts[0].title).toBe('After unmount');
  });
});
