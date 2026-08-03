import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import neo4j, { DateTime, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { PostPaginationQueryDto } from './dto/post-pagination-query.dto';
import { PostsService } from './posts.service';
import type { CommentResponse, PostAuthor } from './types/post.type';

type CommentRecord = {
  comment: Node;
  author: Node;
  isAuthor: boolean;
  parentCommentId: string | null;
};

type CommentOwnerRecord = { authorPersonId: string };

@Injectable()
export class CommentsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly postsService: PostsService,
  ) {}

  async create(
    currentPersonId: string,
    postId: string,
    input: CreateCommentDto,
  ): Promise<CommentResponse> {
    await this.postsService.getOne(currentPersonId, postId);
    const commentId = randomUUID();

    try {
      const result = await this.neo4jService.executeWrite<CommentRecord>(
        `MATCH (author:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         MATCH (postAuthor:Person)-[:POSTED]->(post)
         OPTIONAL MATCH (parent:Comment {commentId: $parentCommentId})-[:ON_POST]->(post)
         WHERE parent IS NULL OR coalesce(parent.moderationStatus, 'VISIBLE') = 'VISIBLE'
         OPTIONAL MATCH (parentAuthor:Person)-[:COMMENTED]->(parent)
         WITH author, post, postAuthor, parent, parentAuthor,
              coalesce(parentAuthor, postAuthor) AS recipient
         WHERE $parentCommentId IS NULL OR parent IS NOT NULL
         CREATE (comment:Comment {
           commentId: $commentId,
           content: $content,
           moderationStatus: 'VISIBLE',
           moderationReason: '',
           createdAt: datetime(),
           updatedAt: datetime()
         })
         CREATE (author)-[:COMMENTED {commentedAt: datetime()}]->(comment)
         CREATE (comment)-[:ON_POST]->(post)
         FOREACH (_ IN CASE WHEN parent IS NULL THEN [] ELSE [1] END |
           CREATE (comment)-[:REPLY_TO {repliedAt: datetime()}]->(parent)
         )
         FOREACH (_ IN CASE WHEN author = recipient THEN [] ELSE [1] END |
           CREATE (notification:Notification {
             notificationId: $notificationId,
             notificationKey: $notificationKey,
             type: CASE WHEN parent IS NULL THEN 'COMMENT' ELSE 'REPLY' END,
             createdAt: datetime(),
             readAt: null
           })
           CREATE (author)-[:TRIGGERED]->(notification)
           CREATE (notification)-[:FOR]->(recipient)
           CREATE (notification)-[:ABOUT_POST]->(post)
           CREATE (notification)-[:ABOUT_COMMENT]->(comment)
         )
         RETURN comment, author, true AS isAuthor,
                parent.commentId AS parentCommentId`,
        {
          currentPersonId,
          postId,
          commentId,
          content: input.content,
          parentCommentId: input.parentCommentId ?? null,
          notificationId: randomUUID(),
          notificationKey: `COMMENT:${commentId}`,
        },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Post not found');
      return this.mapComment(record);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async list(
    currentPersonId: string,
    postId: string,
    pagination: PostPaginationQueryDto,
  ): Promise<CommentResponse[]> {
    await this.postsService.getOne(currentPersonId, postId);
    const skip = (pagination.page - 1) * pagination.limit;

    try {
      const result = await this.neo4jService.executeRead<CommentRecord>(
        `MATCH (viewer:Person {personId: $currentPersonId})
         MATCH (author:Person)-[:COMMENTED]->(comment:Comment)-[:ON_POST]->
               (:Post {postId: $postId})
         WHERE coalesce(comment.moderationStatus, 'VISIBLE') = 'VISIBLE'
         OPTIONAL MATCH (comment)-[:REPLY_TO]->(parent:Comment)
         RETURN comment, author, viewer.personId = author.personId AS isAuthor,
                parent.commentId AS parentCommentId
         ORDER BY comment.createdAt ASC, comment.commentId ASC
         SKIP $skip LIMIT $limit`,
        {
          currentPersonId,
          postId,
          skip: neo4j.int(skip),
          limit: neo4j.int(pagination.limit),
        },
      );
      return result.records.map((record) => this.mapComment(record));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async update(
    currentPersonId: string,
    postId: string,
    commentId: string,
    input: CreateCommentDto,
  ): Promise<CommentResponse> {
    await this.postsService.getOne(currentPersonId, postId);
    await this.assertOwnership(currentPersonId, postId, commentId);

    try {
      const result = await this.neo4jService.executeWrite<CommentRecord>(
        `MATCH (author:Person {personId: $currentPersonId})-[:COMMENTED]->
               (comment:Comment {commentId: $commentId})-[:ON_POST]->
               (:Post {postId: $postId})
         SET comment.content = $content, comment.updatedAt = datetime()
         OPTIONAL MATCH (comment)-[:REPLY_TO]->(parent:Comment)
         RETURN comment, author, true AS isAuthor,
                parent.commentId AS parentCommentId`,
        { currentPersonId, postId, commentId, content: input.content },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Comment not found');
      return this.mapComment(record);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async delete(
    currentPersonId: string,
    postId: string,
    commentId: string,
  ): Promise<{ deleted: true; commentId: string }> {
    await this.postsService.getOne(currentPersonId, postId);
    await this.assertOwnership(currentPersonId, postId, commentId);

    try {
      await this.neo4jService.executeWrite(
        `MATCH (:Person {personId: $currentPersonId})-[:COMMENTED]->
               (comment:Comment {commentId: $commentId})-[:ON_POST]->
               (:Post {postId: $postId})
         OPTIONAL MATCH (reply:Comment)-[:REPLY_TO*1..]->(comment)
         WITH comment, collect(DISTINCT reply) AS replies
         WITH comment, replies, replies + [comment] AS deletedComments
         CALL {
           WITH deletedComments
           UNWIND deletedComments AS deletedComment
           OPTIONAL MATCH (notification:Notification)-[:ABOUT_COMMENT]->
                          (deletedComment)
           RETURN collect(notification) AS notifications
         }
         FOREACH (notification IN notifications | DETACH DELETE notification)
         FOREACH (reply IN replies | DETACH DELETE reply)
         DETACH DELETE comment`,
        { currentPersonId, postId, commentId },
      );
      return { deleted: true, commentId };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async deleteByAdmin(
    commentId: string,
  ): Promise<{ deleted: true; commentId: string }> {
    try {
      const result = await this.neo4jService.executeWrite(
        `MATCH (comment:Comment {commentId: $commentId})
         OPTIONAL MATCH (reply:Comment)-[:REPLY_TO*1..]->(comment)
         WITH comment, collect(DISTINCT reply) AS replies
         WITH comment, replies, replies + [comment] AS deletedComments
         CALL {
           WITH deletedComments
           UNWIND deletedComments AS deletedComment
           OPTIONAL MATCH (notification:Notification)-[:ABOUT_COMMENT]->
                          (deletedComment)
           RETURN collect(notification) AS notifications
         }
         FOREACH (notification IN notifications | DETACH DELETE notification)
         FOREACH (reply IN replies | DETACH DELETE reply)
         DETACH DELETE comment
         RETURN true AS deleted`,
        { commentId },
      );
      if (!result.records[0]) throw new NotFoundException('Comment not found');
      return { deleted: true, commentId };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async assertOwnership(
    currentPersonId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    try {
      const result = await this.neo4jService.executeRead<CommentOwnerRecord>(
        `MATCH (comment:Comment {commentId: $commentId})-[:ON_POST]->
               (:Post {postId: $postId})
         OPTIONAL MATCH (author:Person)-[:COMMENTED]->(comment)
         RETURN author.personId AS authorPersonId`,
        { postId, commentId },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Comment not found');
      if (record.get('authorPersonId') !== currentPersonId) {
        throw new ForbiddenException('Only the author can modify this comment');
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

  private mapComment(record: {
    get<Key extends keyof CommentRecord>(key: Key): CommentRecord[Key];
  }): CommentResponse {
    const comment = record.get('comment').properties as Record<string, unknown>;
    const createdAt = this.requireTemporal(comment.createdAt, 'createdAt');
    return {
      commentId: this.requireString(comment.commentId, 'commentId'),
      content: this.requireString(comment.content, 'content'),
      createdAt,
      updatedAt:
        this.optionalTemporal(comment.updatedAt, 'updatedAt') ?? createdAt,
      author: this.mapAuthor(record.get('author')),
      isAuthor: record.get('isAuthor'),
      parentCommentId: record.get('parentCommentId'),
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

  private optionalTemporal(
    value: unknown,
    propertyName: string,
  ): string | null {
    if (value === null || value === undefined) return null;
    return this.requireTemporal(value, propertyName);
  }
}
