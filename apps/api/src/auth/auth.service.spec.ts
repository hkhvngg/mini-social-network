import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { CreatePersonInput } from '../users/types/person.type';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('hashes the password and never returns passwordHash when registering', async () => {
    let createInput: CreatePersonInput | undefined;
    const usersService = {
      findByUsername: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      createPerson: jest.fn().mockImplementation((input: CreatePersonInput) => {
        createInput = input;
        return Promise.resolve({
          personId: 'person-1',
          username: input.username,
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          bio: '',
          avatarUrl: null,
          isPrivate: false,
          location: input.location,
          interests: input.interests,
          role: 'USER',
          accountStatus: 'ACTIVE',
          suspendedUntil: null,
          moderationReason: '',
          createdAt: '2026-07-31T00:00:00Z',
          updatedAt: '2026-07-31T00:00:00Z',
        });
      }),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );

    const response = await service.register({
      username: 'codex.user',
      email: 'codex@example.com',
      password: 'StrongPass123!',
      fullName: 'Codex User',
      location: 'Đà Nẵng',
    });
    expect(createInput).toBeDefined();
    expect(createInput?.passwordHash).not.toBe('StrongPass123!');
    await expect(
      argon2.verify(createInput?.passwordHash ?? '', 'StrongPass123!'),
    ).resolves.toBe(true);
    expect(response).toEqual({
      accessToken: 'access-token',
      user: {
        personId: 'person-1',
        username: 'codex.user',
        email: 'codex@example.com',
        fullName: 'Codex User',
        bio: '',
        avatarUrl: null,
        isPrivate: false,
        location: 'Đà Nẵng',
        interests: [],
        role: 'USER',
        accountStatus: 'ACTIVE',
        suspendedUntil: null,
        moderationReason: '',
        createdAt: '2026-07-31T00:00:00Z',
      },
    });
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });

  it('rejects a duplicate username before hashing or creating a user', async () => {
    const usersService = {
      findByUsername: jest.fn().mockResolvedValue({ personId: 'existing' }),
      findByEmail: jest.fn().mockResolvedValue(null),
      createPerson: jest.fn(),
    };
    const service = new AuthService(
      usersService as unknown as UsersService,
      { signAsync: jest.fn() } as unknown as JwtService,
    );

    await expect(
      service.register({
        username: 'codex.user',
        email: 'new@example.com',
        password: 'StrongPass123!',
        fullName: 'Codex User',
        location: 'Đà Nẵng',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.createPerson).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    const usersService = {
      findByUsername: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue({ personId: 'existing' }),
      createPerson: jest.fn(),
    };
    const service = new AuthService(
      usersService as unknown as UsersService,
      { signAsync: jest.fn() } as unknown as JwtService,
    );

    await expect(
      service.register({
        username: 'new.user',
        email: 'used@example.com',
        password: 'StrongPass123!',
        fullName: 'New User',
        location: 'Hà Nội',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses one safe message when login identity does not exist', async () => {
    const service = new AuthService(
      {
        findByIdentifier: jest.fn().mockResolvedValue(null),
      } as unknown as UsersService,
      { signAsync: jest.fn() } as unknown as JwtService,
    );

    await expect(
      service.login({ identifier: 'missing', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Tên đăng nhập hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
    });
  });

  it('issues a token after verifying a valid password', async () => {
    const passwordHash = await argon2.hash('StrongPass123!');
    const usersService = {
      findByIdentifier: jest.fn().mockResolvedValue({
        personId: 'person-1',
        username: 'codex.user',
        email: 'codex@example.com',
        passwordHash,
        fullName: 'Codex User',
        bio: '',
        avatarUrl: null,
        isPrivate: false,
        location: 'Đà Nẵng',
        interests: [],
        role: 'USER',
        accountStatus: 'ACTIVE',
        suspendedUntil: null,
        moderationReason: '',
        createdAt: '2026-07-31T00:00:00Z',
        updatedAt: '2026-07-31T00:00:00Z',
      }),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );

    await expect(
      service.login({ identifier: 'codex.user', password: 'StrongPass123!' }),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'person-1',
      username: 'codex.user',
    });
  });

  it('blocks a suspended account even when the password is correct', async () => {
    const passwordHash = await argon2.hash('StrongPass123!');
    const service = new AuthService(
      {
        findByIdentifier: jest.fn().mockResolvedValue({
          personId: 'person-1',
          username: 'codex.user',
          passwordHash,
          accountStatus: 'SUSPENDED',
        }),
      } as unknown as UsersService,
      { signAsync: jest.fn() } as unknown as JwtService,
    );

    await expect(
      service.login({ identifier: 'codex.user', password: 'StrongPass123!' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
