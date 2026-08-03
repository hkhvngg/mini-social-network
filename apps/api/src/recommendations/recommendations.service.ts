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
  sharedInterests: string[];
  sameLocation: boolean;
  recommendationScore: Integer | number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  category: 'PEOPLE_YOU_MAY_KNOW' | 'FRIEND_SUGGESTION';
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
         MATCH (candidate:Person)
         WHERE candidate <> me
           AND NOT EXISTS { MATCH (me)-[:FRIEND]-(candidate) }
         WITH me, candidate,
              [interest IN coalesce(me.interests, [])
               WHERE any(candidateInterest IN coalesce(candidate.interests, [])
                         WHERE toLower(candidateInterest) = toLower(interest))]
                AS sharedInterests,
              toLower(coalesce(me.location, '')) <> '' AND
              toLower(coalesce(me.location, '')) =
                toLower(coalesce(candidate.location, '')) AS sameLocation
         CALL {
           WITH me, candidate
           OPTIONAL MATCH (me)-[:FRIEND]-(mutualFriend:Person)
                          -[:FRIEND]-(candidate)
           RETURN count(DISTINCT mutualFriend) AS mutualFriendCount,
                  collect(DISTINCT CASE WHEN mutualFriend IS NULL THEN null ELSE {
                    personId: mutualFriend.personId,
                    username: mutualFriend.username,
                    fullName: mutualFriend.fullName
                  } END) AS mutualFriends
         }
         WITH me, candidate, mutualFriendCount, mutualFriends,
              sharedInterests, sameLocation,
              mutualFriendCount * 4 + size(sharedInterests) * 3 +
                CASE WHEN sameLocation THEN 2 ELSE 0 END AS recommendationScore
         WHERE recommendationScore > 0
         RETURN candidate, mutualFriendCount, mutualFriends, sharedInterests,
                sameLocation, recommendationScore,
                CASE WHEN mutualFriendCount > 0
                     THEN 'PEOPLE_YOU_MAY_KNOW'
                     ELSE 'FRIEND_SUGGESTION' END AS category,
                EXISTS { MATCH (me)-[:FOLLOW]->(candidate) } AS isFollowing,
                EXISTS { MATCH (candidate)-[:FOLLOW]->(me) } AS isFollowedBy
         ORDER BY recommendationScore DESC, mutualFriendCount DESC,
                  candidate.fullName ASC,
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
      category: record.get('category'),
      personId: this.requireString(candidate.personId, 'personId'),
      username: this.requireString(candidate.username, 'username'),
      fullName: this.requireString(candidate.fullName, 'fullName'),
      avatarUrl:
        typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : null,
      location:
        typeof candidate.location === 'string' ? candidate.location : '',
      mutualFriendCount: this.toSafeCount(record.get('mutualFriendCount')),
      mutualFriends: record
        .get('mutualFriends')
        .map((friend) => this.mapMutualFriend(friend)),
      sharedInterests: record.get('sharedInterests'),
      sameLocation: record.get('sameLocation'),
      recommendationScore: this.toSafeCount(record.get('recommendationScore')),
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
