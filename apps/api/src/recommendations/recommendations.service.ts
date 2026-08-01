import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import neo4j, { Integer, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type {
  FriendRecommendation,
  FriendRecommendationsResponse,
  MutualFriend,
} from './types/friend-recommendation.type';

type RecommendationRecord = {
  candidate: Node;
  mutualFriendCount: Integer | number;
  mutualFriends: Array<Record<string, unknown>>;
  isFollowing: boolean;
  isFollowedBy: boolean;
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async getFriendRecommendations(
    currentPersonId: string,
    limit: number,
  ): Promise<FriendRecommendationsResponse> {
    try {
      const result = await this.neo4jService.executeRead<RecommendationRecord>(
        `MATCH (me:Person {personId: $currentPersonId})
               -[:FRIEND]-(mutualFriend:Person)
               -[:FRIEND]-(candidate:Person)
         WHERE candidate <> me
           AND NOT EXISTS { MATCH (me)-[:FRIEND]-(candidate) }
         WITH me, candidate,
              count(DISTINCT mutualFriend) AS mutualFriendCount,
              collect(DISTINCT {
                personId: mutualFriend.personId,
                username: mutualFriend.username,
                fullName: mutualFriend.fullName
              }) AS mutualFriends
         RETURN candidate, mutualFriendCount, mutualFriends,
                EXISTS { MATCH (me)-[:FOLLOW]->(candidate) } AS isFollowing,
                EXISTS { MATCH (candidate)-[:FOLLOW]->(me) } AS isFollowedBy
         ORDER BY mutualFriendCount DESC, candidate.fullName ASC,
                  candidate.personId ASC
         LIMIT $limit`,
        { currentPersonId, limit: neo4j.int(limit) },
      );

      return {
        items: result.records.map((record) => this.mapRecommendation(record)),
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private mapRecommendation(record: {
    get<Key extends keyof RecommendationRecord>(
      key: Key,
    ): RecommendationRecord[Key];
  }): FriendRecommendation {
    const candidate = record.get('candidate').properties as Record<
      string,
      unknown
    >;

    return {
      personId: this.requireString(candidate.personId, 'personId'),
      username: this.requireString(candidate.username, 'username'),
      fullName: this.requireString(candidate.fullName, 'fullName'),
      avatarUrl:
        typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : null,
      mutualFriendCount: this.toSafeCount(record.get('mutualFriendCount')),
      mutualFriends: record
        .get('mutualFriends')
        .map((friend) => this.mapMutualFriend(friend)),
      relationship: {
        isFollowing: record.get('isFollowing'),
        isFollowedBy: record.get('isFollowedBy'),
        isFriend: false,
      },
    };
  }

  private mapMutualFriend(properties: Record<string, unknown>): MutualFriend {
    return {
      personId: this.requireString(properties.personId, 'mutual.personId'),
      username: this.requireString(properties.username, 'mutual.username'),
      fullName: this.requireString(properties.fullName, 'mutual.fullName'),
    };
  }

  private toSafeCount(value: Integer | number): number {
    const count = neo4j.isInt(value) ? value.toNumber() : value;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new ServiceUnavailableException('Database returned invalid count');
    }
    return count;
  }

  private requireString(value: unknown, propertyName: string): string {
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException(
        `Database returned invalid ${propertyName}`,
      );
    }
    return value;
  }
}
