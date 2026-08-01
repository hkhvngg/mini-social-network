import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import neo4j, { DateTime, Integer, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { UploadsService } from '../uploads/uploads.service';
import type { MediaResourceType } from '../uploads/types/uploaded-media.type';
import type { CreatePostDto } from './dto/create-post.dto';
import type { PostPaginationQueryDto } from './dto/post-pagination-query.dto';
import type { UpdatePostDto } from './dto/update-post.dto';
import type { SharePostDto } from './dto/share-post.dto';
import type {
  PostAuthor,
  PostMedia,
  PostPrivacy,
  PostResponse,
} from './types/post.type';

type PostRecord = {
  post: Node;
  author: Node;
  likeCount: Integer | number;
  commentCount: Integer | number;
  repostCount: Integer | number;
  shareCount: Integer | number;
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
  media: Node[];
};

type OwnershipRecord = { authorPersonId: string };
type DeletionRecord = {
  authorPersonId: string;
  media: Array<{ publicId: string; resourceType: MediaResourceType }>;
};

const POST_PROJECTION = `
  CALL {
    WITH post
    OPTIONAL MATCH (:Person)-[like:LIKES]->(post)
    RETURN count(like) AS likeCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (:Comment)-[commentedOn:ON_POST]->(post)
    RETURN count(commentedOn) AS commentCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (:Person)-[repost:REPOSTED]->(post)
    RETURN count(repost) AS repostCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (:Person)-[share:SHARED]->(post)
    RETURN count(share) AS shareCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
    RETURN collect(media) AS media
  }
  RETURN post, author, likeCount, commentCount, repostCount, shareCount, media,
         EXISTS { MATCH (viewer)-[:LIKES]->(post) } AS likedByCurrentUser,
         EXISTS { MATCH (viewer)-[:REPOSTED]->(post) } AS repostedByCurrentUser,
         viewer.personId = author.personId AS isAuthor
`;

@Injectable()
export class PostsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly uploadsService: UploadsService,
  ) {}

  async create(
    currentPersonId: string,
    input: CreatePostDto,
  ): Promise<PostResponse> {
    try {
      const result = await this.neo4jService.executeWrite<PostRecord>(
        `MATCH (author:Person {personId: $currentPersonId})
         CREATE (post:Post {
           postId: $postId,
           content: $content,
           imageUrl: $imageUrl,
           privacy: $privacy,
           createdAt: datetime(),
           updatedAt: datetime()
         })
         CREATE (author)-[:POSTED {postedAt: datetime()}]->(post)
         FOREACH (_ IN CASE WHEN $mediaPublicId IS NULL THEN [] ELSE [1] END |
           CREATE (media:Media {
             mediaId: $mediaId,
             publicId: $mediaPublicId,
             secureUrl: $mediaSecureUrl,
             resourceType: $mediaResourceType,
             format: $mediaFormat,
             width: $mediaWidth,
             height: $mediaHeight,
             duration: $mediaDuration,
             bytes: $mediaBytes,
             createdAt: datetime()
           })
           CREATE (post)-[:HAS_MEDIA {attachedAt: datetime()}]->(media)
         )
         WITH author, author AS viewer, post, 0 AS likeCount,
              0 AS commentCount, 0 AS repostCount, 0 AS shareCount
         OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
         RETURN post, author, likeCount, commentCount, repostCount, shareCount,
                collect(media) AS media, false AS likedByCurrentUser,
                false AS repostedByCurrentUser, true AS isAuthor`,
        {
          currentPersonId,
          postId: randomUUID(),
          content: input.content,
          imageUrl:
            input.media?.resourceType === 'image'
              ? input.media.secureUrl
              : null,
          privacy: input.privacy,
          mediaId: input.media ? randomUUID() : null,
          mediaPublicId: input.media?.publicId ?? null,
          mediaSecureUrl: input.media?.secureUrl ?? null,
          mediaResourceType: input.media?.resourceType ?? null,
          mediaFormat: input.media?.format ?? null,
          mediaWidth:
            input.media?.width === undefined || input.media.width === null
              ? null
              : neo4j.int(input.media.width),
          mediaHeight:
            input.media?.height === undefined || input.media.height === null
              ? null
              : neo4j.int(input.media.height),
          mediaDuration: input.media?.duration ?? null,
          mediaBytes: input.media ? neo4j.int(input.media.bytes) : null,
        },
      );
      const record = result.records[0];

      if (!record) throw new UnauthorizedException();
      return this.mapPost(record);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async getFeed(
    currentPersonId: string,
    pagination: PostPaginationQueryDto,
  ): Promise<PostResponse[]> {
    const skip = (pagination.page - 1) * pagination.limit;

    try {
      const result = await this.neo4jService.executeRead<PostRecord>(
        `MATCH (viewer:Person {personId: $currentPersonId})
         MATCH (author:Person)-[:POSTED]->(post:Post)
         WHERE author = viewer
            OR post.privacy = 'PUBLIC'
            OR (post.privacy = 'FRIENDS' AND
                EXISTS { MATCH (viewer)-[:FRIEND]-(author) })
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[like:LIKES]->(post)
           RETURN count(like) AS likeCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Comment)-[commentedOn:ON_POST]->(post)
           RETURN count(commentedOn) AS commentCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[repost:REPOSTED]->(post)
           RETURN count(repost) AS repostCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[share:SHARED]->(post)
           RETURN count(share) AS shareCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
           RETURN collect(media) AS media
         }
         RETURN post, author, likeCount, commentCount, repostCount, shareCount, media,
                EXISTS { MATCH (viewer)-[:LIKES]->(post) } AS likedByCurrentUser,
                EXISTS { MATCH (viewer)-[:REPOSTED]->(post) } AS repostedByCurrentUser,
                viewer.personId = author.personId AS isAuthor
         ORDER BY post.createdAt DESC, post.postId DESC
         SKIP $skip LIMIT $limit`,
        {
          currentPersonId,
          skip: neo4j.int(skip),
          limit: neo4j.int(pagination.limit),
        },
      );
      return result.records.map((record) => this.mapPost(record));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async getByUsername(
    currentPersonId: string,
    username: string,
    pagination: PostPaginationQueryDto,
  ): Promise<PostResponse[]> {
    await this.assertUserExists(username);
    const skip = (pagination.page - 1) * pagination.limit;

    try {
      const result = await this.neo4jService.executeRead<PostRecord>(
        `MATCH (viewer:Person {personId: $currentPersonId})
         MATCH (author:Person {username: $username})-[:POSTED]->(post:Post)
         WHERE author = viewer
            OR post.privacy = 'PUBLIC'
            OR (post.privacy = 'FRIENDS' AND
                EXISTS { MATCH (viewer)-[:FRIEND]-(author) })
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[like:LIKES]->(post)
           RETURN count(like) AS likeCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Comment)-[commentedOn:ON_POST]->(post)
           RETURN count(commentedOn) AS commentCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[repost:REPOSTED]->(post)
           RETURN count(repost) AS repostCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (:Person)-[share:SHARED]->(post)
           RETURN count(share) AS shareCount
         }
         CALL {
           WITH post
           OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
           RETURN collect(media) AS media
         }
         RETURN post, author, likeCount, commentCount, repostCount, shareCount, media,
                EXISTS { MATCH (viewer)-[:LIKES]->(post) } AS likedByCurrentUser,
                EXISTS { MATCH (viewer)-[:REPOSTED]->(post) } AS repostedByCurrentUser,
                viewer.personId = author.personId AS isAuthor
         ORDER BY post.createdAt DESC, post.postId DESC
         SKIP $skip LIMIT $limit`,
        {
          currentPersonId,
          username,
          skip: neo4j.int(skip),
          limit: neo4j.int(pagination.limit),
        },
      );
      return result.records.map((record) => this.mapPost(record));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async getOne(currentPersonId: string, postId: string): Promise<PostResponse> {
    try {
      const result = await this.neo4jService.executeRead<PostRecord>(
        `MATCH (viewer:Person {personId: $currentPersonId})
         MATCH (author:Person)-[:POSTED]->(post:Post {postId: $postId})
         WHERE author = viewer
            OR post.privacy = 'PUBLIC'
            OR (post.privacy = 'FRIENDS' AND
                EXISTS { MATCH (viewer)-[:FRIEND]-(author) })
         ${POST_PROJECTION}`,
        { currentPersonId, postId },
      );
      const record = result.records[0];

      if (!record) throw new NotFoundException('Post not found');
      return this.mapPost(record);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async update(
    currentPersonId: string,
    postId: string,
    input: UpdatePostDto,
  ): Promise<PostResponse> {
    const hasContent = input.content !== undefined;
    const hasPrivacy = input.privacy !== undefined;

    if (!hasContent && !hasPrivacy) {
      throw new BadRequestException('At least one post field is required');
    }

    await this.assertOwnership(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (author:Person {personId: $currentPersonId})-[:POSTED]->
               (post:Post {postId: $postId})
         SET post.content = CASE WHEN $hasContent THEN $content ELSE post.content END,
             post.privacy = CASE WHEN $hasPrivacy THEN $privacy ELSE post.privacy END,
             post.updatedAt = datetime()
         RETURN post`,
        {
          currentPersonId,
          postId,
          hasContent,
          content: input.content ?? null,
          hasPrivacy,
          privacy: input.privacy ?? null,
        },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async delete(
    currentPersonId: string,
    postId: string,
  ): Promise<{ deleted: true; postId: string }> {
    const media = await this.getOwnedMedia(currentPersonId, postId);

    await Promise.all(
      media.map((item) =>
        this.uploadsService.deleteAsset(item.publicId, item.resourceType),
      ),
    );

    try {
      await this.neo4jService.executeWrite(
        `MATCH (:Person {personId: $currentPersonId})-[:POSTED]->
               (post:Post {postId: $postId})
         OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
         WITH post, collect(media) AS mediaItems
         OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
         WITH post, mediaItems, collect(comment) AS comments
         FOREACH (media IN mediaItems | DETACH DELETE media)
         FOREACH (comment IN comments | DETACH DELETE comment)
         DETACH DELETE post`,
        { currentPersonId, postId },
      );
      return { deleted: true, postId };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async like(currentPersonId: string, postId: string): Promise<PostResponse> {
    await this.getOne(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         MERGE (person)-[like:LIKES]->(post)
         ON CREATE SET like.likedAt = datetime(), like.reaction = 'LIKE'
         RETURN like`,
        { currentPersonId, postId },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async unlike(currentPersonId: string, postId: string): Promise<PostResponse> {
    await this.getOne(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         OPTIONAL MATCH (person)-[like:LIKES]->(post)
         WITH collect(like) AS likes
         FOREACH (existing IN likes | DELETE existing)`,
        { currentPersonId, postId },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async repost(currentPersonId: string, postId: string): Promise<PostResponse> {
    await this.getOne(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         MERGE (person)-[repost:REPOSTED]->(post)
         ON CREATE SET repost.repostedAt = datetime()
         RETURN repost`,
        { currentPersonId, postId },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async unrepost(
    currentPersonId: string,
    postId: string,
  ): Promise<PostResponse> {
    await this.getOne(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         OPTIONAL MATCH (person)-[repost:REPOSTED]->(post)
         WITH collect(repost) AS reposts
         FOREACH (existing IN reposts | DELETE existing)`,
        { currentPersonId, postId },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async share(
    currentPersonId: string,
    postId: string,
    input: SharePostDto,
  ): Promise<PostResponse> {
    await this.getOne(currentPersonId, postId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         MERGE (person)-[share:SHARED]->(post)
         SET share.sharedAt = datetime(), share.channel = $channel
         RETURN share`,
        { currentPersonId, postId, channel: input.channel },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  private async assertOwnership(
    currentPersonId: string,
    postId: string,
  ): Promise<void> {
    try {
      const result = await this.neo4jService.executeRead<OwnershipRecord>(
        `MATCH (post:Post {postId: $postId})
         OPTIONAL MATCH (author:Person)-[:POSTED]->(post)
         RETURN author.personId AS authorPersonId`,
        { postId },
      );
      const record = result.records[0];

      if (!record) throw new NotFoundException('Post not found');
      if (record.get('authorPersonId') !== currentPersonId) {
        throw new ForbiddenException('Only the author can modify this post');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async getOwnedMedia(
    currentPersonId: string,
    postId: string,
  ): Promise<Array<{ publicId: string; resourceType: MediaResourceType }>> {
    try {
      const result = await this.neo4jService.executeRead<DeletionRecord>(
        `MATCH (post:Post {postId: $postId})
         OPTIONAL MATCH (author:Person)-[:POSTED]->(post)
         OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
         RETURN author.personId AS authorPersonId,
                collect(CASE WHEN media IS NULL THEN null ELSE {
                  publicId: media.publicId,
                  resourceType: media.resourceType
                } END) AS media`,
        { postId },
      );
      const record = result.records[0];

      if (!record) throw new NotFoundException('Post not found');
      if (record.get('authorPersonId') !== currentPersonId) {
        throw new ForbiddenException('Only the author can modify this post');
      }

      return record.get('media').map((item) => ({
        publicId: this.requireString(item.publicId, 'media.publicId'),
        resourceType: this.requireMediaResourceType(item.resourceType),
      }));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async assertUserExists(username: string): Promise<void> {
    try {
      const result = await this.neo4jService.executeRead(
        `MATCH (person:Person {username: $username})
         RETURN person.personId AS personId`,
        { username },
      );
      if (!result.records[0]) throw new NotFoundException('User not found');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private mapPost(record: {
    get<Key extends keyof PostRecord>(key: Key): PostRecord[Key];
  }): PostResponse {
    const post = record.get('post').properties as Record<string, unknown>;
    const createdAt = this.requireTemporal(post.createdAt, 'createdAt');

    return {
      postId: this.requireString(post.postId, 'postId'),
      content: this.requireString(post.content, 'content'),
      imageUrl: typeof post.imageUrl === 'string' ? post.imageUrl : null,
      media: record.get('media').map((node) => this.mapMedia(node)),
      privacy: this.requirePrivacy(post.privacy),
      createdAt,
      updatedAt: this.optionalTemporal(post.updatedAt) ?? createdAt,
      author: this.mapAuthor(record.get('author')),
      likeCount: this.toSafeCount(record.get('likeCount')),
      commentCount: this.toSafeCount(record.get('commentCount')),
      repostCount: this.toSafeCount(record.get('repostCount')),
      shareCount: this.toSafeCount(record.get('shareCount')),
      likedByCurrentUser: record.get('likedByCurrentUser'),
      repostedByCurrentUser: record.get('repostedByCurrentUser'),
      isAuthor: record.get('isAuthor'),
    };
  }

  private mapAuthor(node: Node): PostAuthor {
    const author = node.properties as Record<string, unknown>;
    return {
      personId: this.requireString(author.personId, 'author.personId'),
      username: this.requireString(author.username, 'author.username'),
      fullName: this.requireString(author.fullName, 'author.fullName'),
      avatarUrl: typeof author.avatarUrl === 'string' ? author.avatarUrl : null,
    };
  }

  private mapMedia(node: Node): PostMedia {
    const media = node.properties as Record<string, unknown>;

    return {
      mediaId: this.requireString(media.mediaId, 'media.mediaId'),
      publicId: this.requireString(media.publicId, 'media.publicId'),
      secureUrl: this.requireString(media.secureUrl, 'media.secureUrl'),
      resourceType: this.requireMediaResourceType(media.resourceType),
      format: typeof media.format === 'string' ? media.format : null,
      width: this.optionalSafeNumber(media.width),
      height: this.optionalSafeNumber(media.height),
      duration: this.optionalFiniteNumber(media.duration),
      bytes: this.toSafeCount(media.bytes as Integer | number),
    };
  }

  private requireMediaResourceType(value: unknown): MediaResourceType {
    if (value === 'image' || value === 'video') return value;
    throw new ServiceUnavailableException(
      'Database returned invalid media resource type',
    );
  }

  private optionalSafeNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const number = neo4j.isInt(value) ? value.toNumber() : value;
    return typeof number === 'number' && Number.isSafeInteger(number)
      ? number
      : null;
  }

  private optionalFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private requirePrivacy(value: unknown): PostPrivacy {
    if (value === 'PUBLIC' || value === 'FRIENDS' || value === 'PRIVATE') {
      return value;
    }
    throw new ServiceUnavailableException('Database returned invalid privacy');
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

  private requireTemporal(value: unknown, propertyName: string): string {
    if (typeof value === 'string') return value;
    if (value instanceof DateTime) return value.toString();
    throw new ServiceUnavailableException(
      `Database returned invalid ${propertyName}`,
    );
  }

  private optionalTemporal(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    return this.requireTemporal(value, 'temporal');
  }
}
