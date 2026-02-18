import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

/**
 * Extract the current authenticated user from the request.
 * Use with @UseGuards(JwtAuthGuard).
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
