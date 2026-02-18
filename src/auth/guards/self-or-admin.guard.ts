import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';

export const SELF_OR_ADMIN_PARAM_KEY = 'selfOrAdminParam';

/**
 * Guard that allows access if the authenticated user is the resource owner
 * (request.params[id] === user.id) or has ADMIN role.
 * Use with @UseGuards(JwtAuthGuard, SelfOrAdminGuard).
 * Param name defaults to 'id'; override with SetMetadata(SELF_OR_ADMIN_PARAM_KEY, 'userId').
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException('Access denied');
    }

    const paramKey =
      this.reflector.get<string>(
        SELF_OR_ADMIN_PARAM_KEY,
        context.getHandler(),
      ) ?? 'id';
    const paramId = request.params?.[paramKey];
    if (!paramId) {
      throw new ForbiddenException('Resource id required');
    }

    const isSelf = user.id === paramId;
    const isAdmin = user.role === UserRole.ADMIN;
    if (isSelf || isAdmin) {
      return true;
    }

    throw new ForbiddenException('You can only access your own resource');
  }
}
