import { Neo4jService } from '../neo4j/neo4j.service';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  it('uses DISTINCT mutual friends, deterministic ordering, and a parameterized limit', async () => {
    let capturedQuery = '';
    let capturedParameters: Record<string, unknown> = {};
    const neo4jService = {
      executeRead: jest
        .fn()
        .mockImplementation(
          (query: string, parameters: Record<string, unknown>) => {
            capturedQuery = query;
            capturedParameters = parameters;
            return Promise.resolve({ records: [] });
          },
        ),
    };
    const service = new RecommendationsService(
      neo4jService as unknown as Neo4jService,
    );

    await expect(service.getFriendRecommendations('P001', 10)).resolves.toEqual(
      { items: [] },
    );
    expect(capturedQuery).toContain('count(DISTINCT mutualFriend)');
    expect(capturedQuery).toContain('NOT EXISTS');
    expect(capturedQuery).toContain('sharedInterests');
    expect(capturedQuery).toContain('sameLocation');
    expect(capturedQuery).toContain("THEN 'PEOPLE_YOU_MAY_KNOW'");
    expect(capturedQuery).toContain('ORDER BY recommendationScore DESC');
    expect(capturedQuery).toContain('LIMIT $limit');
    expect(capturedParameters).toEqual(
      expect.objectContaining({ currentPersonId: 'P001' }),
    );
  });

  it('maps candidate, mutual friends, interests, and relationship state', async () => {
    const values = {
      candidate: {
        properties: {
          personId: 'P002',
          username: 'linh',
          fullName: 'Linh',
          avatarUrl: null,
          location: 'Huế',
        },
      },
      mutualFriendCount: neo4j.int(1),
      mutualFriends: [{ personId: 'P003', username: 'an', fullName: 'An' }],
      sharedInterests: ['Sách'],
      sameLocation: true,
      recommendationScore: neo4j.int(9),
      isFollowing: false,
      isFollowedBy: true,
      category: 'PEOPLE_YOU_MAY_KNOW',
    };
    const record = { get: (key: keyof typeof values) => values[key] };
    const service = new RecommendationsService({
      executeRead: jest.fn().mockResolvedValue({ records: [record] }),
    } as unknown as Neo4jService);

    await expect(service.getFriendRecommendations('P001', 5)).resolves.toEqual({
      items: [
        expect.objectContaining({
          personId: 'P002',
          mutualFriendCount: 1,
          sharedInterests: ['Sách'],
          recommendationScore: 9,
          relationship: {
            isFollowing: false,
            isFollowedBy: true,
            isFriend: false,
          },
        }),
      ],
    });
  });

  it('returns an empty list when no candidate has a positive score', async () => {
    const service = new RecommendationsService({
      executeRead: jest.fn().mockResolvedValue({ records: [] }),
    } as unknown as Neo4jService);

    await expect(service.getFriendRecommendations('P001', 20)).resolves.toEqual(
      { items: [] },
    );
  });

  it('rejects unsafe recommendation counts returned by Neo4j', async () => {
    const values = {
      candidate: {
        properties: { personId: 'P002', username: 'linh', fullName: 'Linh' },
      },
      mutualFriendCount: -1,
      mutualFriends: [],
      sharedInterests: [],
      sameLocation: false,
      recommendationScore: 1,
      isFollowing: false,
      isFollowedBy: false,
      category: 'FRIEND_SUGGESTION',
    };
    const service = new RecommendationsService({
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: (key: keyof typeof values) => values[key] }],
      }),
    } as unknown as Neo4jService);

    await expect(
      service.getFriendRecommendations('P001', 5),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps a Neo4j outage to ServiceUnavailableException', async () => {
    const service = new RecommendationsService({
      executeRead: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Neo4jService);

    await expect(
      service.getFriendRecommendations('P001', 5),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
import { ServiceUnavailableException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
