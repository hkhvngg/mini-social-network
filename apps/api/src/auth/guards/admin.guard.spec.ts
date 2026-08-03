import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const contextFor = (role?: string, hasUser = true) =>
    ({
      switchToHttp: () => ({
        getRequest: () => (hasUser ? { user: { role } } : {}),
      }),
    }) as unknown as ExecutionContext;

  it('allows administrators', () => {
    expect(new AdminGuard().canActivate(contextFor('ADMIN'))).toBe(true);
  });

  it('rejects regular users', () => {
    expect(new AdminGuard().canActivate(contextFor('USER'))).toBe(false);
  });

  it('rejects unauthenticated requests', () => {
    expect(new AdminGuard().canActivate(contextFor(undefined, false))).toBe(
      false,
    );
  });

  it('treats role names as case-sensitive', () => {
    expect(new AdminGuard().canActivate(contextFor('admin'))).toBe(false);
  });

  it('rejects a user whose role is missing', () => {
    expect(new AdminGuard().canActivate(contextFor(undefined))).toBe(false);
  });
});
