import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restrict route access to users with the given roles.
 * Use with RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
