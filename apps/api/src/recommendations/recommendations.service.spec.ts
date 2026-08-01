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
    expect(capturedQuery).toContain('ORDER BY mutualFriendCount DESC');
    expect(capturedQuery).toContain('LIMIT $limit');
    expect(capturedParameters).toEqual(
      expect.objectContaining({ currentPersonId: 'P001' }),
    );
  });
});
