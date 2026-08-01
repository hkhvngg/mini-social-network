import { BadRequestException, ConflictException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { MeProfile } from './types/person-public.type';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('maps a Neo4j uniqueness race to ConflictException', async () => {
    const neo4jService = {
      executeWrite: jest.fn().mockRejectedValue({
        code: 'Neo.ClientError.Schema.ConstraintValidationFailed',
      }),
    };
    const service = new UsersService(neo4jService as unknown as Neo4jService);

    await expect(
      service.createPerson({
        username: 'duplicate',
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        fullName: 'Duplicate User',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(neo4jService.executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('$username'),
      expect.objectContaining({
        username: 'duplicate',
        email: 'duplicate@example.com',
      }),
    );
  });

  it('rejects an empty profile update before querying Neo4j', async () => {
    const neo4jService = { executeWrite: jest.fn() };
    const service = new UsersService(neo4jService as unknown as Neo4jService);

    await expect(service.updateProfile('person-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(neo4jService.executeWrite).not.toHaveBeenCalled();
  });

  it('updates only fields selected by internal whitelist flags', async () => {
    const neo4jService = {
      executeWrite: jest.fn().mockResolvedValue({ records: [{}] }),
    };
    const service = new UsersService(neo4jService as unknown as Neo4jService);
    const profile: MeProfile = {
      personId: 'person-1',
      username: 'codex.user',
      email: 'codex@example.com',
      fullName: 'Updated Name',
      bio: 'Existing bio',
      avatarUrl: null,
      isPrivate: false,
      canViewConnections: true,
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T00:01:00Z',
      stats: {
        friendCount: 0,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      },
      relationship: {
        isSelf: true,
        isFollowing: false,
        isFollowedBy: false,
        isFriend: false,
      },
    };
    jest.spyOn(service, 'findMe').mockResolvedValue(profile);

    await expect(
      service.updateProfile('person-1', { fullName: 'Updated Name' }),
    ).resolves.toBe(profile);
    expect(neo4jService.executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('$hasFullName'),
      {
        personId: 'person-1',
        hasFullName: true,
        fullName: 'Updated Name',
        hasBio: false,
        bio: null,
        hasAvatarUrl: false,
        avatarUrl: null,
        hasIsPrivate: false,
        isPrivate: null,
      },
    );
  });

  it('searches users with parameters and maps privacy safely', async () => {
    const values = {
      person: {
        properties: {
          personId: 'person-2',
          username: 'mai.nguyen',
          fullName: 'Mai Nguyen',
          bio: 'Designer',
          avatarUrl: null,
          isPrivate: true,
        },
      },
      isSelf: false,
      isFollowing: false,
      isFollowedBy: true,
      isFriend: false,
    };
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: (key: keyof typeof values) => values[key] }],
      }),
    };
    const service = new UsersService(neo4jService as unknown as Neo4jService);

    await expect(
      service.searchUsers('person-1', { q: 'mai', page: 1, limit: 20 }),
    ).resolves.toEqual([
      {
        personId: 'person-2',
        username: 'mai.nguyen',
        fullName: 'Mai Nguyen',
        bio: 'Designer',
        avatarUrl: null,
        isPrivate: true,
        relationship: {
          isSelf: false,
          isFollowing: false,
          isFollowedBy: true,
          isFriend: false,
        },
      },
    ]);
    expect(neo4jService.executeRead).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        viewerPersonId: 'person-1',
        query: 'mai',
      }),
    );
  });
});
