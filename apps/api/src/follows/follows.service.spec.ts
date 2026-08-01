import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { FollowsService } from './follows.service';

function existenceResult(currentExists = true, targetExists = true) {
  const values = { currentExists, targetExists };
  return {
    records: [
      {
        get: (key: keyof typeof values) => values[key],
      },
    ],
  };
}

function relationshipResult(overrides: Record<string, unknown> = {}) {
  const values = {
    targetPersonId: 'person-2',
    isSelf: false,
    isFollowing: true,
    isFollowedBy: false,
    isFriend: false,
    followedAt: '2026-07-31T00:00:00Z',
    friendSince: null,
    ...overrides,
  };
  return {
    records: [
      {
        get: (key: keyof typeof values) => values[key],
      },
    ],
  };
}

describe('FollowsService', () => {
  it('rejects self-follow before executing a write query', async () => {
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue(existenceResult()),
      executeWrite: jest.fn(),
    };
    const service = new FollowsService(neo4jService as unknown as Neo4jService);

    await expect(service.follow('person-1', 'person-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(neo4jService.executeWrite).not.toHaveBeenCalled();
  });

  it('uses MERGE and parameters for an idempotent follow write', async () => {
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue(existenceResult()),
      executeWrite: jest.fn().mockResolvedValue(relationshipResult()),
    };
    const service = new FollowsService(neo4jService as unknown as Neo4jService);

    await expect(service.follow('person-1', 'person-2')).resolves.toEqual({
      targetPersonId: 'person-2',
      isSelf: false,
      isFollowing: true,
      isFollowedBy: false,
      isFriend: false,
      followedAt: '2026-07-31T00:00:00Z',
      friendSince: null,
    });
    expect(neo4jService.executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (me)-[follow:FOLLOW]->(target)'),
      { currentPersonId: 'person-1', targetPersonId: 'person-2' },
    );
    expect(neo4jService.executeWrite).toHaveBeenCalledWith(
      expect.stringContaining("derivedFrom = 'MUTUAL_FOLLOW'"),
      expect.any(Object),
    );
  });

  it('deletes only the outgoing follow and friend in one unfollow query', async () => {
    let capturedQuery = '';
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue(existenceResult()),
      executeWrite: jest.fn().mockImplementation((query: string) => {
        capturedQuery = query;
        return Promise.resolve(
          relationshipResult({
            isFollowing: false,
            isFollowedBy: true,
            followedAt: null,
          }),
        );
      }),
    };
    const service = new FollowsService(neo4jService as unknown as Neo4jService);

    await expect(service.unfollow('person-1', 'person-2')).resolves.toEqual(
      expect.objectContaining({
        isFollowing: false,
        isFollowedBy: true,
        isFriend: false,
      }),
    );
    expect(capturedQuery).toContain('DELETE existing');
    expect(capturedQuery).toContain('(target)-[reverseFollow:FOLLOW]->(me)');
  });

  it('blocks another user from viewing a private connection list', async () => {
    const values = {
      viewerExists: true,
      ownerPersonId: 'person-2',
      isPrivate: true,
    };
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: (key: keyof typeof values) => values[key] }],
      }),
    };
    const service = new FollowsService(neo4jService as unknown as Neo4jService);

    await expect(
      service.getUserFollowers('person-1', 'private.user', {
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(neo4jService.executeRead).toHaveBeenCalledTimes(1);
  });

  it('allows the owner to view their private connection list', async () => {
    const access = {
      viewerExists: true,
      ownerPersonId: 'person-1',
      isPrivate: true,
    };
    const neo4jService = {
      executeRead: jest
        .fn()
        .mockResolvedValueOnce({
          records: [{ get: (key: keyof typeof access) => access[key] }],
        })
        .mockResolvedValueOnce(existenceResult())
        .mockResolvedValueOnce({ records: [] }),
    };
    const service = new FollowsService(neo4jService as unknown as Neo4jService);

    await expect(
      service.getUserFriends('person-1', 'private.user', {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual([]);
  });
});
