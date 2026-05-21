/**
 * Barrel exports for all hooks in @rhino/client
 */

// Authentication
export { useAuth } from './useAuth';

// Organization
export { useOrganization } from './useOrganization';
export { useOwner } from './useOwner';
export { useOrganizationExists } from './useOrganizationExists';

// Model CRUD Operations
export {
  useModelIndex,
  useModelShow,
  useModelStore,
  useModelUpdate,
  useModelDelete,
} from './useModel';

// Soft Delete Operations
export {
  useModelTrashed,
  useModelRestore,
  useModelForceDelete,
} from './useModel';

// Advanced Operations
export {
  useNestedOperations,
  useModelAudit,
} from './useModel';

// Invitations
export {
  useInvitations,
  useInviteUser,
  useResendInvitation,
  useCancelInvitation,
  useAcceptInvitation,
} from './useInvitations';

// Role
export { useUserRole } from './useUserRole';

// Other Hooks
export { useToast } from './use-toast';

// Deprecated (backward compatibility)
export { useModelQuery } from './useModelQuery';
