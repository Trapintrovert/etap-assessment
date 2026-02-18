import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SelfOrAdminGuard, SELF_OR_ADMIN_PARAM_KEY } from '../../../src/auth/guards/self-or-admin.guard';
import { UserRole } from '../../../src/entities/user.entity';

describe('SelfOrAdminGuard', () => {
  let guard: SelfOrAdminGuard;
  let reflector: Reflector;

  const createMockContext = (user: { id: string; role: UserRole }, params: Record<string, string>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    guard = new SelfOrAdminGuard(reflector);
  });

  it('should allow access when user.id matches params.id (self)', () => {
    const ctx = createMockContext(
      { id: 'user-123', role: UserRole.USER },
      { id: 'user-123' },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user is ADMIN even if id does not match', () => {
    const ctx = createMockContext(
      { id: 'admin-1', role: UserRole.ADMIN },
      { id: 'other-user-456' },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user is not self and not admin', () => {
    const ctx = createMockContext(
      { id: 'user-123', role: UserRole.USER },
      { id: 'other-user-456' },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('You can only access your own resource');
  });

  it('should throw ForbiddenException when user is missing', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null, params: { id: 'user-123' } }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Access denied');
  });

  it('should throw ForbiddenException when param id is missing', () => {
    const ctx = createMockContext(
      { id: 'user-123', role: UserRole.USER },
      {},
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Resource id required');
  });

  it('should use custom param key from metadata when set', () => {
    (reflector.get as jest.Mock).mockReturnValue('userId');
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123', role: UserRole.USER },
          params: { userId: 'user-123' },
        }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(SELF_OR_ADMIN_PARAM_KEY, expect.anything());
  });
});
