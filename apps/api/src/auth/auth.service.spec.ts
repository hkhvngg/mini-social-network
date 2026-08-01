import { JwtService } from '@nestjs/jwt';
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
        createdAt: '2026-07-31T00:00:00Z',
      },
    });
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });
});
