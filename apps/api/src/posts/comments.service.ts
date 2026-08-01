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

    try {
      const result = await this.neo4jService.executeWrite<CommentRecord>(
        `MATCH (author:Person {personId: $currentPersonId})
         MATCH (post:Post {postId: $postId})
         CREATE (comment:Comment {
           commentId: $commentId,
           content: $content,
           createdAt: datetime(),
           updatedAt: datetime()
         })
         CREATE (author)-[:COMMENTED {commentedAt: datetime()}]->(comment)
         CREATE (comment)-[:ON_POST]->(post)
         RETURN comment, author, true AS isAuthor`,
        {
          currentPersonId,
          postId,
          commentId: randomUUID(),
          content: input.content,
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
         RETURN comment, author, viewer.personId = author.personId AS isAuthor
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
         RETURN comment, author, true AS isAuthor`,
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
         DETACH DELETE comment`,
        { currentPersonId, postId, commentId },
      );
      return { deleted: true, commentId };
    } catch {
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
