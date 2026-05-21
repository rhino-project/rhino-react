import { describe, it, expect, vi } from 'vitest';

// Mock cogent-js to prevent unhandled rejection from its broken build
vi.mock('cogent-js/src/index.js', () => {
  class Query {
    constructor() {}
  }
  return { Query, default: { Query } };
});

describe('barrel exports – src/index.ts', () => {
  it('should export all hooks from the main entry point', async () => {
    const mod = await import('../index');

    // Hooks
    expect(mod.useModelIndex).toBeTypeOf('function');
    expect(mod.useModelShow).toBeTypeOf('function');
    expect(mod.useModelStore).toBeTypeOf('function');
    expect(mod.useModelUpdate).toBeTypeOf('function');
    expect(mod.useModelDelete).toBeTypeOf('function');
    expect(mod.useModelTrashed).toBeTypeOf('function');
    expect(mod.useModelRestore).toBeTypeOf('function');
    expect(mod.useModelForceDelete).toBeTypeOf('function');
    expect(mod.useNestedOperations).toBeTypeOf('function');
    expect(mod.useModelAudit).toBeTypeOf('function');
    expect(mod.useModelQuery).toBeTypeOf('function');
    expect(mod.useOrganization).toBeTypeOf('function');
    expect(mod.useOwner).toBeTypeOf('function');
    expect(mod.useOrganizationExists).toBeTypeOf('function');
    expect(mod.useUserRole).toBeTypeOf('function');
    expect(mod.useToast).toBeTypeOf('function');
  });

  it('should export all lib utilities from the main entry point', async () => {
    const mod = await import('../index');

    expect(mod.configureApi).toBeTypeOf('function');
    expect(mod.extractPaginationFromHeaders).toBeTypeOf('function');
    expect(mod.cn).toBeTypeOf('function');
  });

  it('should export AuthProvider and useAuth', async () => {
    const mod = await import('../index');

    expect(mod.AuthProvider).toBeTypeOf('function');
    expect(mod.useAuth).toBeTypeOf('function');
  });

  it('should export invitation hooks', async () => {
    const mod = await import('../index');

    expect(mod.useInvitations).toBeTypeOf('function');
    expect(mod.useInviteUser).toBeTypeOf('function');
    expect(mod.useResendInvitation).toBeTypeOf('function');
    expect(mod.useCancelInvitation).toBeTypeOf('function');
    expect(mod.useAcceptInvitation).toBeTypeOf('function');
  });
});

describe('barrel exports – hooks/index.ts', () => {
  it('should export all hooks from hooks barrel', async () => {
    const mod = await import('../hooks/index');

    expect(mod.useModelIndex).toBeTypeOf('function');
    expect(mod.useModelShow).toBeTypeOf('function');
    expect(mod.useOrganization).toBeTypeOf('function');
    expect(mod.useOwner).toBeTypeOf('function');
    expect(mod.useUserRole).toBeTypeOf('function');
    expect(mod.useToast).toBeTypeOf('function');
  });
});

describe('barrel exports – lib/index.ts', () => {
  it('should export all lib utilities', async () => {
    const mod = await import('../lib/index');

    expect(mod.configureApi).toBeTypeOf('function');
    expect(mod.extractPaginationFromHeaders).toBeTypeOf('function');
    expect(mod.cn).toBeTypeOf('function');
  });
});

describe('useAuth re-export', () => {
  it('should re-export useAuth from context', async () => {
    const mod = await import('../hooks/useAuth');
    expect(mod.useAuth).toBeTypeOf('function');
  });
});

// ------------------------------------------------------------------
// Regression: initStorage must be exported from barrel (Bug 5)
// ------------------------------------------------------------------

describe('initStorage barrel export', () => {
  it('should export initStorage from main entry point', async () => {
    const mod = await import('../index');
    expect(mod.initStorage).toBeTypeOf('function');
  });

  it('should export initStorage from lib barrel', async () => {
    const mod = await import('../lib/index');
    expect(mod.initStorage).toBeTypeOf('function');
  });

  it('should export initStorage from storage module', async () => {
    const mod = await import('../lib/storage');
    expect(mod.initStorage).toBeTypeOf('function');
  });

  it('initStorage should resolve without error (no-op on web)', async () => {
    const mod = await import('../lib/storage');
    await expect(mod.initStorage()).resolves.toBeUndefined();
  });
});
