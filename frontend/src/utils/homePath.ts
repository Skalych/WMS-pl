import { UserRole } from '../types';

/** Landing path after login / unauthorized redirect. */
export function homePathForRole(role: UserRole | undefined): string {
  switch (role) {
    case UserRole.INBOUND_OPERATOR:
    case UserRole.PICKER:
    case UserRole.PACKER_DISPATCHER:
      return '/my-shift';
    case UserRole.ADMIN_MANAGER:
    default:
      return '/';
  }
}

export function isFloorRole(role: UserRole | undefined): boolean {
  return (
    role === UserRole.PICKER ||
    role === UserRole.INBOUND_OPERATOR ||
    role === UserRole.PACKER_DISPATCHER
  );
}
