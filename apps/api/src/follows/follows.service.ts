import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import neo4j, { DateTime, Node } from 'neo4j-driver';
import { randomUUID } from 'node:crypto';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { PaginationQueryDto } from './dto/pagination-query.dto';
import type { ConnectionListItem } from './types/connection-list-item.type';
import type { FollowRelationshipStatus } from './types/follow-relationship-status.type';

type RelationshipRecord = {
  targetPersonId: string;
  isSelf: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  followedAt: DateTime | string | null;
  friendSince: DateTime | string | null;
};

type ExistenceRecord = {
  currentExists: boolean;
  targetExists: boolean;
};

type ConnectionRecord = {
  person: Node;
  connectedAt: DateTime | string | null;
};

type ConnectionAccessRecord = {
  viewerExists: boolean;
  ownerPersonId: string | null;
  isPrivate: boolean;
};

const RELATIONSHIP_RETURN = `
  RETURN target.personId AS targetPersonId,
         me = target AS isSelf,
         me <> target AND follow IS NOT NULL AS isFollowing,
         me <> target AND reverseFollow IS NOT NULL AS isFollowedBy,
         me <> target AND friend IS NOT NULL AS isFriend,
         CASE WHEN me = target THEN null ELSE follow.followedAt END AS followedAt,
         CASE WHEN me = target THEN null ELSE friend.since END AS friendSince
`;

@Injectable()
export class FollowsService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async follow(
    currentPersonId: string,
    targetPersonId: string,
  ): Promise<FollowRelationshipStatus> {
    await this.ensureParticipantsExist(currentPersonId, targetPersonId);

    if (currentPersonId === targetPersonId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const record = await this.executeRelationshipWrite(
      `MATCH (me:Person {personId: $currentPersonId})
       MATCH (target:Person {personId: $targetPersonId})
       MERGE (me)-[follow:FOLLOW]->(target)
       ON CREATE SET follow.followedAt = datetime()
       MERGE (followNotification:Notification {notificationKey: $followNotificationKey})
       ON CREATE SET followNotification.notificationId = $followNotificationId,
                     followNotification.type = 'FOLLOW',
                     followNotification.createdAt = follow.followedAt,
                     followNotification.readAt = null
       MERGE (me)-[:TRIGGERED]->(followNotification)
       MERGE (followNotification)-[:FOR]->(target)
       WITH me, target, follow
       OPTIONAL MATCH (target)-[reverseFollow:FOLLOW]->(me)
       WITH me, target, follow, reverseFollow,
            CASE WHEN me.personId < target.personId THEN me ELSE target END AS firstPerson,
            CASE WHEN me.personId < target.personId THEN target ELSE me END AS secondPerson
       FOREACH (_ IN CASE WHEN reverseFollow IS NULL THEN [] ELSE [1] END |
         MERGE (firstPerson)-[newFriend:FRIEND]->(secondPerson)
         ON CREATE SET newFriend.since = datetime(),
                       newFriend.derivedFrom = 'MUTUAL_FOLLOW'
         MERGE (friendForTarget:Notification {notificationKey: $friendForTargetKey})
         ON CREATE SET friendForTarget.notificationId = $friendForTargetId,
                       friendForTarget.type = 'FRIEND',
                       friendForTarget.createdAt = datetime(),
                       friendForTarget.readAt = null
         MERGE (me)-[:TRIGGERED]->(friendForTarget)
         MERGE (friendForTarget)-[:FOR]->(target)
         MERGE (friendForMe:Notification {notificationKey: $friendForMeKey})
         ON CREATE SET friendForMe.notificationId = $friendForMeId,
                       friendForMe.type = 'FRIEND',
                       friendForMe.createdAt = datetime(),
                       friendForMe.readAt = null
         MERGE (target)-[:TRIGGERED]->(friendForMe)
         MERGE (friendForMe)-[:FOR]->(me)
       )
       WITH me, target, follow, reverseFollow
       OPTIONAL MATCH (me)-[friend:FRIEND]-(target)
       ${RELATIONSHIP_RETURN}`,
      {
        currentPersonId,
        targetPersonId,
        followNotificationKey: `FOLLOW:${currentPersonId}:${targetPersonId}`,
        followNotificationId: randomUUID(),
        friendForTargetKey: `FRIEND:${currentPersonId}:${targetPersonId}`,
        friendForTargetId: randomUUID(),
        friendForMeKey: `FRIEND:${targetPersonId}:${currentPersonId}`,
        friendForMeId: randomUUID(),
      },
    );

    return this.mapRelationship(record);
  }

  async unfollow(
    currentPersonId: string,
    targetPersonId: string,
  ): Promise<FollowRelationshipStatus> {
    await this.ensureParticipantsExist(currentPersonId, targetPersonId);

    if (currentPersonId === targetPersonId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }

    const record = await this.executeRelationshipWrite(
      `MATCH (me:Person {personId: $currentPersonId})
       MATCH (target:Person {personId: $targetPersonId})
       OPTIONAL MATCH (me)-[existingFollow:FOLLOW]->(target)
       OPTIONAL MATCH (followNotification:Notification {
         notificationKey: $followNotificationKey
       })
       OPTIONAL MATCH (friendForTarget:Notification {
         notificationKey: $friendForTargetKey
       })
       OPTIONAL MATCH (friendForMe:Notification {
         notificationKey: $friendForMeKey
       })
       WITH me, target, collect(existingFollow) AS follows,
            collect(DISTINCT followNotification) +
            collect(DISTINCT friendForTarget) +
            collect(DISTINCT friendForMe) AS obsoleteNotifications
       FOREACH (existing IN follows | DELETE existing)
       FOREACH (notification IN obsoleteNotifications | DETACH DELETE notification)
       WITH me, target
       OPTIONAL MATCH (me)-[existingFriend:FRIEND]-(target)
       WITH me, target, collect(existingFriend) AS friends
       FOREACH (existing IN friends | DELETE existing)
       WITH me, target
       OPTIONAL MATCH (target)-[reverseFollow:FOLLOW]->(me)
       WITH me, target, null AS follow, reverseFollow, null AS friend
       ${RELATIONSHIP_RETURN}`,
      {
        currentPersonId,
        targetPersonId,
        followNotificationKey: `FOLLOW:${currentPersonId}:${targetPersonId}`,
        friendForTargetKey: `FRIEND:${currentPersonId}:${targetPersonId}`,
        friendForMeKey: `FRIEND:${targetPersonId}:${currentPersonId}`,
      },
    );

    return this.mapRelationship(record);
  }

  async getRelationshipStatus(
    currentPersonId: string,
    targetPersonId: string,
  ): Promise<FollowRelationshipStatus> {
    await this.ensureParticipantsExist(currentPersonId, targetPersonId);

    try {
      const result = await this.neo4jService.executeRead<RelationshipRecord>(
        `MATCH (me:Person {personId: $currentPersonId})
         MATCH (target:Person {personId: $targetPersonId})
         OPTIONAL MATCH (me)-[follow:FOLLOW]->(target)
         WITH me, target, head(collect(follow)) AS follow
         OPTIONAL MATCH (target)-[reverseFollow:FOLLOW]->(me)
         WITH me, target, follow, head(collect(reverseFollow)) AS reverseFollow
         OPTIONAL MATCH (me)-[candidateFriend:FRIEND]-(target)
         WITH me, target, follow, reverseFollow,
              head(collect(candidateFriend)) AS friend
         ${RELATIONSHIP_RETURN}`,
        { currentPersonId, targetPersonId },
      );
      const record = result.records[0];

      if (!record) {
        throw new ServiceUnavailableException('Database returned no status');
      }

      return this.mapRelationship(record);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  getFollowers(
    personId: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.getConnectionList(
      personId,
      pagination,
      `MATCH (person:Person)-[connection:FOLLOW]->(me:Person {personId: $personId})
       RETURN person, connection.followedAt AS connectedAt
       ORDER BY connectedAt DESC, person.username ASC
       SKIP $skip LIMIT $limit`,
    );
  }

  getFollowing(
    personId: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.getConnectionList(
      personId,
      pagination,
      `MATCH (me:Person {personId: $personId})-[connection:FOLLOW]->(person:Person)
       RETURN person, connection.followedAt AS connectedAt
       ORDER BY connectedAt DESC, person.username ASC
       SKIP $skip LIMIT $limit`,
    );
  }

  getFriends(
    personId: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.getConnectionList(
      personId,
      pagination,
      `MATCH (me:Person {personId: $personId})-[connection:FRIEND]-(person:Person)
       RETURN person, connection.since AS connectedAt
       ORDER BY connectedAt DESC, person.username ASC
       SKIP $skip LIMIT $limit`,
    );
  }

  async getUserFollowers(
    viewerPersonId: string,
    username: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    const personId = await this.getVisibleConnectionOwner(
      viewerPersonId,
      username,
    );
    return this.getFollowers(personId, pagination);
  }

  async getUserFollowing(
    viewerPersonId: string,
    username: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    const personId = await this.getVisibleConnectionOwner(
      viewerPersonId,
      username,
    );
    return this.getFollowing(personId, pagination);
  }

  async getUserFriends(
    viewerPersonId: string,
    username: string,
    pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    const personId = await this.getVisibleConnectionOwner(
      viewerPersonId,
      username,
    );
    return this.getFriends(personId, pagination);
  }

  private async getVisibleConnectionOwner(
    viewerPersonId: string,
    username: string,
  ): Promise<string> {
    try {
      const result =
        await this.neo4jService.executeRead<ConnectionAccessRecord>(
          `OPTIONAL MATCH (viewer:Person {personId: $viewerPersonId})
         OPTIONAL MATCH (owner:Person {username: $username})
         RETURN viewer IS NOT NULL AS viewerExists,
                owner.personId AS ownerPersonId,
                coalesce(owner.isPrivate, false) AS isPrivate`,
          { viewerPersonId, username },
        );
      const record = result.records[0];

      if (!record?.get('viewerExists')) throw new UnauthorizedException();
      const ownerPersonId = record.get('ownerPersonId');
      if (!ownerPersonId) throw new NotFoundException('User not found');
      if (record.get('isPrivate') && ownerPersonId !== viewerPersonId) {
        throw new ForbiddenException('This profile keeps connections private');
      }

      return ownerPersonId;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async getConnectionList(
    personId: string,
    pagination: PaginationQueryDto,
    cypher: string,
  ): Promise<ConnectionListItem[]> {
    await this.ensureParticipantsExist(personId, personId);
    const skip = (pagination.page - 1) * pagination.limit;

    try {
      const result = await this.neo4jService.executeRead<ConnectionRecord>(
        cypher,
        {
          personId,
          skip: neo4j.int(skip),
          limit: neo4j.int(pagination.limit),
        },
      );
      return result.records.map((record) =>
        this.mapConnection(record.get('person'), record.get('connectedAt')),
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async ensureParticipantsExist(
    currentPersonId: string,
    targetPersonId: string,
  ): Promise<void> {
    try {
      const result = await this.neo4jService.executeRead<ExistenceRecord>(
        `OPTIONAL MATCH (current:Person {personId: $currentPersonId})
         OPTIONAL MATCH (target:Person {personId: $targetPersonId})
         RETURN current IS NOT NULL AS currentExists,
                target IS NOT NULL AS targetExists`,
        { currentPersonId, targetPersonId },
      );
      const record = result.records[0];

      if (!record?.get('currentExists')) {
        throw new UnauthorizedException();
      }
      if (!record.get('targetExists')) {
        throw new NotFoundException('Target user not found');
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async executeRelationshipWrite(
    cypher: string,
    parameters: Record<string, unknown>,
  ) {
    try {
      const result = await this.neo4jService.executeWrite<RelationshipRecord>(
        cypher,
        parameters,
      );
      const record = result.records[0];

      if (!record) {
        throw new ServiceUnavailableException('Database returned no status');
      }
      return record;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private mapRelationship(record: {
    get<Key extends keyof RelationshipRecord>(
      key: Key,
    ): RelationshipRecord[Key];
  }): FollowRelationshipStatus {
    return {
      targetPersonId: record.get('targetPersonId'),
      isSelf: record.get('isSelf'),
      isFollowing: record.get('isFollowing'),
      isFollowedBy: record.get('isFollowedBy'),
      isFriend: record.get('isFriend'),
      followedAt: this.stringifyTemporal(record.get('followedAt')),
      friendSince: this.stringifyTemporal(record.get('friendSince')),
    };
  }

  private mapConnection(
    node: Node,
    connectedAt: DateTime | string | null,
  ): ConnectionListItem {
    const properties = node.properties as Record<string, unknown>;

    return {
      personId: this.requireString(properties.personId, 'personId'),
      username: this.requireString(properties.username, 'username'),
      fullName: this.requireString(properties.fullName, 'fullName'),
      bio: typeof properties.bio === 'string' ? properties.bio : '',
      avatarUrl:
        typeof properties.avatarUrl === 'string' ? properties.avatarUrl : null,
      connectedAt: this.stringifyTemporal(connectedAt),
    };
  }

  private stringifyTemporal(value: DateTime | string | null): string | null {
    if (value === null) return null;
    return typeof value === 'string' ? value : value.toString();
  }

  private requireString(value: unknown, propertyName: string): string {
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException(
        `Database returned an invalid ${propertyName}`,
      );
    }
    return value;
  }
}
