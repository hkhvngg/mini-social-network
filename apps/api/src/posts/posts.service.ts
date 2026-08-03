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
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
  media: Node[];
  sourcePost: Node | null;
  sourceAuthor: Node | null;
  sourceMedia: Node[];
};

type OwnershipRecord = { authorPersonId: string };
type DeletionRecord = {
  authorPersonId: string;
  media: Array<{ publicId: string; resourceType: MediaResourceType }>;
};
type RepostRecord = { repostPostId: string };

const POST_PROJECTION = `
  CALL {
    WITH post
    OPTIONAL MATCH (:Person)-[like:LIKES]->(post)
    RETURN count(like) AS likeCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (comment:Comment)-[commentedOn:ON_POST]->(post)
    WHERE coalesce(comment.moderationStatus, 'VISIBLE') = 'VISIBLE'
    RETURN count(commentedOn) AS commentCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (:Post)-[repost:REPOST_OF]->(post)
    RETURN count(repost) AS repostCount
  }
  CALL {
    WITH post
    OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
    RETURN collect(media) AS media
  }
  CALL {
    WITH post, viewer
    OPTIONAL MATCH (post)-[:REPOST_OF]->(candidate:Post)
    OPTIONAL MATCH (candidateAuthor:Person)-[:POSTED]->(candidate)
    WITH candidate, candidateAuthor, viewer,
         candidate IS NOT NULL AND
         coalesce(candidate.moderationStatus, 'VISIBLE') = 'VISIBLE' AND (
           candidateAuthor = viewer OR candidate.privacy = 'PUBLIC' OR
           (candidate.privacy = 'FRIENDS' AND
            EXISTS { MATCH (viewer)-[:FRIEND]-(candidateAuthor) })
         ) AS canViewSource
    OPTIONAL MATCH (candidate)-[:HAS_MEDIA]->(candidateMedia:Media)
    WITH candidate, candidateAuthor, canViewSource,
         collect(candidateMedia) AS candidateMediaItems
    RETURN CASE WHEN canViewSource THEN candidate ELSE null END AS sourcePost,
           CASE WHEN canViewSource THEN candidateAuthor ELSE null END AS sourceAuthor,
           CASE WHEN canViewSource THEN candidateMediaItems ELSE [] END AS sourceMedia
  }
  RETURN post, author, likeCount, commentCount, repostCount, media,
         sourcePost, sourceAuthor, sourceMedia,
         EXISTS { MATCH (viewer)-[:LIKES]->(post) } AS likedByCurrentUser,
         (EXISTS {
           MATCH (viewer)-[:POSTED]->(:Post)-[:REPOST_OF]->(post)
         } OR EXISTS {
           MATCH (viewer)-[:POSTED]->(post)-[:REPOST_OF]->(:Post)
         }) AS repostedByCurrentUser,
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
           moderationStatus: 'VISIBLE',
           moderationReason: '',
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
              0 AS commentCount, 0 AS repostCount
         OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
         RETURN post, author, likeCount, commentCount, repostCount,
                collect(media) AS media, false AS likedByCurrentUser,
                false AS repostedByCurrentUser, true AS isAuthor,
                null AS sourcePost, null AS sourceAuthor, [] AS sourceMedia`,
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
         WHERE coalesce(post.moderationStatus, 'VISIBLE') = 'VISIBLE'
           AND (author = viewer
             OR post.privacy = 'PUBLIC'
             OR (post.privacy = 'FRIENDS' AND
                 EXISTS { MATCH (viewer)-[:FRIEND]-(author) }))
         ${POST_PROJECTION}
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
         WHERE coalesce(post.moderationStatus, 'VISIBLE') = 'VISIBLE'
           AND (author = viewer
             OR post.privacy = 'PUBLIC'
             OR (post.privacy = 'FRIENDS' AND
                 EXISTS { MATCH (viewer)-[:FRIEND]-(author) }))
         ${POST_PROJECTION}
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
         WHERE coalesce(post.moderationStatus, 'VISIBLE') = 'VISIBLE'
           AND (author = viewer
             OR post.privacy = 'PUBLIC'
             OR (post.privacy = 'FRIENDS' AND
                 EXISTS { MATCH (viewer)-[:FRIEND]-(author) }))
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

    return this.deletePostAndAssets(postId, media, currentPersonId);
  }

  async deleteByAdmin(
    postId: string,
  ): Promise<{ deleted: true; postId: string }> {
    const media = await this.getMedia(postId);
    return this.deletePostAndAssets(postId, media);
  }

  private async deletePostAndAssets(
    postId: string,
    media: Array<{ publicId: string; resourceType: MediaResourceType }>,
    currentPersonId?: string,
  ): Promise<{ deleted: true; postId: string }> {
    await Promise.all(
      media.map((item) =>
        this.uploadsService.deleteAsset(item.publicId, item.resourceType),
      ),
    );

    try {
      await this.neo4jService.executeWrite(
        `MATCH (post:Post {postId: $postId})
         OPTIONAL MATCH (post)-[:HAS_MEDIA]->(media:Media)
         WITH post, collect(media) AS mediaItems
         OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
         WITH post, mediaItems, collect(comment) AS comments
         OPTIONAL MATCH (postNotification:Notification)-[:ABOUT_POST]->(post)
         WITH post, mediaItems, comments, collect(postNotification) AS postNotifications
         CALL {
           WITH comments
           UNWIND comments AS targetComment
           OPTIONAL MATCH (commentNotification:Notification)-[:ABOUT_COMMENT]->
                          (targetComment)
           RETURN collect(commentNotification) AS commentNotifications
         }
         WITH post, mediaItems, comments,
              postNotifications + commentNotifications AS notifications
         FOREACH (notification IN notifications | DETACH DELETE notification)
         FOREACH (media IN mediaItems | DETACH DELETE media)
         FOREACH (comment IN comments | DETACH DELETE comment)
         DETACH DELETE post`,
        currentPersonId ? { currentPersonId, postId } : { postId },
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
         MATCH (author:Person)-[:POSTED]->(post:Post {postId: $postId})
         MERGE (person)-[like:LIKES]->(post)
         ON CREATE SET like.likedAt = datetime(), like.reaction = 'LIKE'
         FOREACH (_ IN CASE WHEN person = author THEN [] ELSE [1] END |
           MERGE (notification:Notification {notificationKey: $notificationKey})
           ON CREATE SET notification.notificationId = $notificationId,
                         notification.type = 'LIKE',
                         notification.createdAt = like.likedAt,
                         notification.readAt = null
           MERGE (person)-[:TRIGGERED]->(notification)
           MERGE (notification)-[:FOR]->(author)
           MERGE (notification)-[:ABOUT_POST]->(post)
         )
         RETURN like`,
        {
          currentPersonId,
          postId,
          notificationKey: `LIKE:${currentPersonId}:${postId}`,
          notificationId: randomUUID(),
        },
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
         OPTIONAL MATCH (notification:Notification {
           notificationKey: $notificationKey
         })
         WITH collect(like) AS likes, collect(notification) AS notifications
         FOREACH (existing IN likes | DELETE existing)
         FOREACH (notification IN notifications | DETACH DELETE notification)`,
        {
          currentPersonId,
          postId,
          notificationKey: `LIKE:${currentPersonId}:${postId}`,
        },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, postId);
  }

  async repost(currentPersonId: string, postId: string): Promise<PostResponse> {
    const selectedPost = await this.getOne(currentPersonId, postId);
    const sourcePostId = selectedPost.repostOf?.postId ?? postId;
    const repostPostId = randomUUID();

    try {
      const result = await this.neo4jService.executeWrite<RepostRecord>(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (source:Post {postId: $sourcePostId})
         MATCH (sourceAuthor:Person)-[:POSTED]->(source)
         MERGE (repost:Post {repostKey: $repostKey})
         ON CREATE SET repost.postId = $repostPostId,
                       repost.content = $content,
                       repost.imageUrl = null,
                       repost.privacy = $privacy,
                       repost.moderationStatus = 'VISIBLE',
                       repost.moderationReason = '',
                       repost.createdAt = datetime(),
                       repost.updatedAt = datetime()
         MERGE (person)-[posted:POSTED]->(repost)
         ON CREATE SET posted.postedAt = datetime()
         MERGE (repost)-[relation:REPOST_OF]->(source)
         ON CREATE SET relation.repostedAt = datetime()
         FOREACH (_ IN CASE WHEN person = sourceAuthor THEN [] ELSE [1] END |
           MERGE (notification:Notification {notificationKey: $notificationKey})
           ON CREATE SET notification.notificationId = $notificationId,
                         notification.type = 'REPOST',
                         notification.createdAt = relation.repostedAt,
                         notification.readAt = null
           MERGE (person)-[:TRIGGERED]->(notification)
           MERGE (notification)-[:FOR]->(sourceAuthor)
           MERGE (notification)-[:ABOUT_POST]->(source)
         )
         RETURN repost.postId AS repostPostId`,
        {
          currentPersonId,
          sourcePostId,
          repostKey: `${currentPersonId}:${sourcePostId}`,
          repostPostId,
          content: '',
          privacy: 'PUBLIC',
          notificationKey: `REPOST:${currentPersonId}:${sourcePostId}`,
          notificationId: randomUUID(),
        },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Post not found');
      return this.getOne(currentPersonId, record.get('repostPostId'));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async unrepost(
    currentPersonId: string,
    postId: string,
  ): Promise<PostResponse> {
    const selectedPost = await this.getOne(currentPersonId, postId);
    const sourcePostId = selectedPost.repostOf?.postId ?? postId;

    try {
      await this.neo4jService.executeWrite(
        `MATCH (person:Person {personId: $currentPersonId})
         MATCH (source:Post {postId: $sourcePostId})
         OPTIONAL MATCH (person)-[:POSTED]->(repost:Post)-[:REPOST_OF]->(source)
         OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(repost)
         OPTIONAL MATCH (repostNotification:Notification {
           notificationKey: $notificationKey
         })
         OPTIONAL MATCH (postNotification:Notification)-[:ABOUT_POST]->(repost)
         OPTIONAL MATCH (commentNotification:Notification)-[:ABOUT_COMMENT]->(comment)
         WITH repost, collect(DISTINCT comment) AS comments,
              collect(DISTINCT repostNotification) +
              collect(DISTINCT postNotification) +
              collect(DISTINCT commentNotification) AS notifications
         FOREACH (notification IN notifications | DETACH DELETE notification)
         FOREACH (comment IN comments | DETACH DELETE comment)
         FOREACH (_ IN CASE WHEN repost IS NULL THEN [] ELSE [1] END |
           DETACH DELETE repost
         )`,
        {
          currentPersonId,
          sourcePostId,
          notificationKey: `REPOST:${currentPersonId}:${sourcePostId}`,
        },
      );
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return this.getOne(currentPersonId, sourcePostId);
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

  private async getMedia(
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
      return record.get('media').map((item) => ({
        publicId: this.requireString(item.publicId, 'media.publicId'),
        resourceType: this.requireMediaResourceType(item.resourceType),
      }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
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
      likedByCurrentUser: record.get('likedByCurrentUser'),
      repostedByCurrentUser: record.get('repostedByCurrentUser'),
      isAuthor: record.get('isAuthor'),
      repostOf: this.mapRepostSource(record),
    };
  }

  private mapRepostSource(record: {
    get<Key extends keyof PostRecord>(key: Key): PostRecord[Key];
  }): PostResponse['repostOf'] {
    const sourceNode = record.get('sourcePost');
    const sourceAuthor = record.get('sourceAuthor');
    if (!sourceNode || !sourceAuthor) return null;

    const source = sourceNode.properties as Record<string, unknown>;
    return {
      postId: this.requireString(source.postId, 'source.postId'),
      content: this.requireString(source.content, 'source.content'),
      imageUrl: typeof source.imageUrl === 'string' ? source.imageUrl : null,
      media: record.get('sourceMedia').map((node) => this.mapMedia(node)),
      privacy: this.requirePrivacy(source.privacy),
      createdAt: this.requireTemporal(source.createdAt, 'source.createdAt'),
      author: this.mapAuthor(sourceAuthor),
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
