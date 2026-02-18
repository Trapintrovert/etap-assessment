import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/auth/guards/roles.guard';
import { ROLES_KEY } from '../../../src/auth/decorators/roles.decorator';
import { UserRole } from '../../../src/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user: { role: UserRole } | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const ctx = createMockContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role (ADMIN)', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext({ role: UserRole.USER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Admin access required');
  });

  it('should throw ForbiddenException when user is missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Access denied');
  });

  it('should read ROLES_KEY from handler and class', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
    const handler = () => ({});
    const cls = class {};
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.USER } }) }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, cls]);
  });
});
