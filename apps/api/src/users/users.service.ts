import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import neo4j, { Integer, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { SearchUsersQueryDto } from './dto/search-users-query.dto';
import {
  mapMeProfileNode,
  mapPersonNode,
  mapPublicProfileNode,
} from './mappers/person.mapper';
import type {
  MeProfile,
  ProfileStats,
  PublicProfile,
} from './types/person-public.type';
import type { CreatePersonInput, PersonAccount } from './types/person.type';
import type { RelationshipStatus } from './types/relationship-status.type';
import type { UserSearchResult } from './types/user-search-result.type';

type PersonRecord = { person: Node };

type SearchRecord = {
  person: Node;
  isSelf: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
};

type ProfileRecord = {
  person: Node;
  friendCount: Integer | number;
  followerCount: Integer | number;
  followingCount: Integer | number;
  postCount: Integer | number;
  isSelf: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
};

const PROFILE_PROJECTION = `
  CALL {
    WITH person
    OPTIONAL MATCH (person)-[:FRIEND]-(friend:Person)
    RETURN count(DISTINCT friend) AS friendCount
  }
  CALL {
    WITH person
    OPTIONAL MATCH (follower:Person)-[:FOLLOW]->(person)
    RETURN count(DISTINCT follower) AS followerCount
  }
  CALL {
    WITH person
    OPTIONAL MATCH (person)-[:FOLLOW]->(following:Person)
    RETURN count(DISTINCT following) AS followingCount
  }
  CALL {
    WITH person
    OPTIONAL MATCH (person)-[:POSTED]->(post:Post)
    RETURN count(DISTINCT post) AS postCount
  }
  OPTIONAL MATCH (viewer:Person)
  WHERE $viewerPersonId IS NOT NULL AND viewer.personId = $viewerPersonId
  WITH person, viewer, friendCount, followerCount, followingCount, postCount,
       viewer IS NOT NULL AND viewer.personId = person.personId AS isSelf
  RETURN person, friendCount, followerCount, followingCount, postCount, isSelf,
         CASE WHEN viewer IS NULL OR isSelf THEN false
              ELSE EXISTS { MATCH (viewer)-[:FOLLOW]->(person) }
         END AS isFollowing,
         CASE WHEN viewer IS NULL OR isSelf THEN false
              ELSE EXISTS { MATCH (person)-[:FOLLOW]->(viewer) }
         END AS isFollowedBy,
         CASE WHEN viewer IS NULL OR isSelf THEN false
              ELSE EXISTS { MATCH (viewer)-[:FRIEND]-(person) }
         END AS isFriend
`;

@Injectable()
export class UsersService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async findByUsername(username: string): Promise<PersonAccount | null> {
    return this.findOne(
      `MATCH (person:Person {username: $username})
       RETURN person
       LIMIT 1`,
      { username },
    );
  }

  async findByEmail(email: string): Promise<PersonAccount | null> {
    return this.findOne(
      `MATCH (person:Person {email: $email})
       RETURN person
       LIMIT 1`,
      { email },
    );
  }

  async findByIdentifier(identifier: string): Promise<PersonAccount | null> {
    return this.findOne(
      `MATCH (person:Person)
       WHERE person.username = $identifier OR person.email = $identifier
       RETURN person
       LIMIT 1`,
      { identifier },
    );
  }

  async findById(personId: string): Promise<PersonAccount | null> {
    return this.findOne(
      `MATCH (person:Person {personId: $personId})
       RETURN person
       LIMIT 1`,
      { personId },
    );
  }

  async createPerson(input: CreatePersonInput): Promise<PersonAccount> {
    try {
      const result = await this.neo4jService.executeWrite<PersonRecord>(
        `CREATE (person:Person {
           personId: $personId,
           username: $username,
           email: $email,
           passwordHash: $passwordHash,
           fullName: $fullName,
           bio: '',
           avatarUrl: null,
           isPrivate: false,
           createdAt: datetime(),
           updatedAt: datetime()
         })
         RETURN person`,
        {
          personId: randomUUID(),
          username: input.username,
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
        },
      );
      const record = result.records[0];

      if (!record) {
        throw new Error('Create person query returned no records');
      }

      return mapPersonNode(record.get('person'));
    } catch (error) {
      if (this.isConstraintViolation(error)) {
        throw new ConflictException('Username or email already exists');
      }

      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async findPublicProfileByUsername(
    username: string,
    viewerPersonId?: string,
  ): Promise<PublicProfile> {
    const record = await this.findProfileRecord(
      `MATCH (person:Person {username: $username}) ${PROFILE_PROJECTION}`,
      { username, viewerPersonId: viewerPersonId ?? null },
    );

    if (!record) {
      throw new NotFoundException('User not found');
    }

    const { stats, relationship } = this.mapProfileMetadata(record);
    return mapPublicProfileNode(record.get('person'), stats, relationship);
  }

  async findMe(personId: string): Promise<MeProfile> {
    const record = await this.findProfileRecord(
      `MATCH (person:Person {personId: $personId}) ${PROFILE_PROJECTION}`,
      { personId, viewerPersonId: personId },
    );

    if (!record) {
      throw new UnauthorizedException();
    }

    const { stats, relationship } = this.mapProfileMetadata(record);
    return mapMeProfileNode(record.get('person'), stats, relationship);
  }

  async searchUsers(
    viewerPersonId: string,
    query: SearchUsersQueryDto,
  ): Promise<UserSearchResult[]> {
    const skip = (query.page - 1) * query.limit;

    try {
      const result = await this.neo4jService.executeRead<SearchRecord>(
        `MATCH (viewer:Person {personId: $viewerPersonId})
         MATCH (person:Person)
         WHERE toLower(person.username) CONTAINS $query
            OR toLower(person.fullName) CONTAINS $query
         RETURN person,
                viewer = person AS isSelf,
                viewer <> person AND EXISTS {
                  MATCH (viewer)-[:FOLLOW]->(person)
                } AS isFollowing,
                viewer <> person AND EXISTS {
                  MATCH (person)-[:FOLLOW]->(viewer)
                } AS isFollowedBy,
                viewer <> person AND EXISTS {
                  MATCH (viewer)-[:FRIEND]-(person)
                } AS isFriend
         ORDER BY CASE WHEN toLower(person.username) = $query THEN 0 ELSE 1 END,
                  person.fullName ASC, person.personId ASC
         SKIP $skip LIMIT $limit`,
        {
          viewerPersonId,
          query: query.q,
          skip: neo4j.int(skip),
          limit: neo4j.int(query.limit),
        },
      );

      return result.records.map((record) => this.mapSearchResult(record));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async updateProfile(
    personId: string,
    input: UpdateProfileDto,
  ): Promise<MeProfile> {
    const hasFullName = input.fullName !== undefined;
    const hasBio = input.bio !== undefined;
    const hasAvatarUrl = input.avatarUrl !== undefined;
    const hasIsPrivate = input.isPrivate !== undefined;

    if (!hasFullName && !hasBio && !hasAvatarUrl && !hasIsPrivate) {
      throw new BadRequestException('At least one profile field is required');
    }

    try {
      const result = await this.neo4jService.executeWrite<PersonRecord>(
        `MATCH (person:Person {personId: $personId})
         SET person.fullName = CASE WHEN $hasFullName THEN $fullName ELSE person.fullName END,
             person.bio = CASE WHEN $hasBio THEN $bio ELSE person.bio END,
             person.avatarUrl = CASE WHEN $hasAvatarUrl THEN $avatarUrl ELSE person.avatarUrl END,
             person.isPrivate = CASE WHEN $hasIsPrivate THEN $isPrivate ELSE coalesce(person.isPrivate, false) END,
             person.updatedAt = datetime()
         RETURN person`,
        {
          personId,
          hasFullName,
          fullName: input.fullName ?? null,
          hasBio,
          bio: input.bio ?? null,
          hasAvatarUrl,
          avatarUrl: input.avatarUrl ?? null,
          hasIsPrivate,
          isPrivate: input.isPrivate ?? null,
        },
      );

      if (!result.records[0]) {
        throw new UnauthorizedException();
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.findMe(personId);
  }

  private async findOne(
    cypher: string,
    parameters: Record<string, unknown>,
  ): Promise<PersonAccount | null> {
    try {
      const result = await this.neo4jService.executeRead<PersonRecord>(
        cypher,
        parameters,
      );
      const record = result.records[0];

      return record ? mapPersonNode(record.get('person')) : null;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async findProfileRecord(
    cypher: string,
    parameters: Record<string, unknown>,
  ) {
    try {
      const result = await this.neo4jService.executeRead<ProfileRecord>(
        cypher,
        parameters,
      );
      return result.records[0] ?? null;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private mapProfileMetadata(record: {
    get<Key extends keyof ProfileRecord>(key: Key): ProfileRecord[Key];
  }): { stats: ProfileStats; relationship: RelationshipStatus } {
    return {
      stats: {
        friendCount: this.toSafeCount(record.get('friendCount')),
        followerCount: this.toSafeCount(record.get('followerCount')),
        followingCount: this.toSafeCount(record.get('followingCount')),
        postCount: this.toSafeCount(record.get('postCount')),
      },
      relationship: {
        isSelf: record.get('isSelf'),
        isFollowing: record.get('isFollowing'),
        isFollowedBy: record.get('isFollowedBy'),
        isFriend: record.get('isFriend'),
      },
    };
  }

  private mapSearchResult(record: {
    get<Key extends keyof SearchRecord>(key: Key): SearchRecord[Key];
  }): UserSearchResult {
    const person = record.get('person').properties as Record<string, unknown>;

    return {
      personId: this.requireString(person.personId, 'personId'),
      username: this.requireString(person.username, 'username'),
      fullName: this.requireString(person.fullName, 'fullName'),
      bio: typeof person.bio === 'string' ? person.bio : '',
      avatarUrl: typeof person.avatarUrl === 'string' ? person.avatarUrl : null,
      isPrivate: person.isPrivate === true,
      relationship: {
        isSelf: record.get('isSelf'),
        isFollowing: record.get('isFollowing'),
        isFollowedBy: record.get('isFollowedBy'),
        isFriend: record.get('isFriend'),
      },
    };
  }

  private requireString(value: unknown, propertyName: string): string {
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException(
        `Database returned invalid ${propertyName}`,
      );
    }
    return value;
  }

  private toSafeCount(value: Integer | number): number {
    const count = neo4j.isInt(value) ? value.toNumber() : value;

    if (!Number.isSafeInteger(count) || count < 0) {
      throw new ServiceUnavailableException(
        'Database returned an invalid count',
      );
    }

    return count;
  }

  private isConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed'
    );
  }
}
