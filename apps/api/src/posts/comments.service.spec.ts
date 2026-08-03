import { ForbiddenException, NotFoundException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CommentsService } from './comments.service';
import { PostsService } from './posts.service';

describe('CommentsService', () => {
  const visiblePost = { postId: 'post-1' };

  it('creates a parameterized Comment and its graph relationships', async () => {
    let query = '';
    let parameters: Record<string, unknown> = {};
    const values = {
      comment: {
        properties: {
          commentId: 'comment-1',
          content: 'Xin chào',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
      },
      author: {
        properties: {
          personId: 'person-1',
          username: 'author',
          fullName: 'Post Author',
          avatarUrl: null,
        },
      },
      isAuthor: true,
      parentCommentId: null,
    };
    const neo4jService = {
      executeWrite: jest.fn(
        (
          capturedQuery: string,
          capturedParameters: Record<string, unknown>,
        ) => {
          query = capturedQuery;
          parameters = capturedParameters;
          return Promise.resolve({
            records: [{ get: (key: keyof typeof values) => values[key] }],
          });
        },
      ),
    };
    const postsService = {
      getOne: jest.fn().mockResolvedValue(visiblePost),
    };
    const service = new CommentsService(
      neo4jService as unknown as Neo4jService,
      postsService as unknown as PostsService,
    );

    const result = await service.create('person-1', 'post-1', {
      content: 'Xin chào',
    });

    expect(postsService.getOne).toHaveBeenCalledWith('person-1', 'post-1');
    expect(query).toContain('CREATE (author)-[:COMMENTED');
    expect(query).toContain('CREATE (comment)-[:ON_POST]->(post)');
    expect(query).not.toContain('Xin chào');
    expect(parameters).toMatchObject({
      currentPersonId: 'person-1',
      postId: 'post-1',
      parentCommentId: null,
      content: 'Xin chào',
    });
    expect(result.commentId).toBe('comment-1');
    expect(result.parentCommentId).toBeNull();
  });

  it('creates a reply with a parameterized REPLY_TO relationship', async () => {
    let query = '';
    let parameters: Record<string, unknown> = {};
    const values = {
      comment: {
        properties: {
          commentId: 'reply-1',
          content: 'Reply',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z',
        },
      },
      author: {
        properties: {
          personId: 'person-1',
          username: 'author',
          fullName: 'Post Author',
          avatarUrl: null,
        },
      },
      isAuthor: true,
      parentCommentId: 'comment-1',
    };
    const neo4jService = {
      executeWrite: jest.fn(
        (
          capturedQuery: string,
          capturedParameters: Record<string, unknown>,
        ) => {
          query = capturedQuery;
          parameters = capturedParameters;
          return Promise.resolve({
            records: [{ get: (key: keyof typeof values) => values[key] }],
          });
        },
      ),
    };
    const postsService = {
      getOne: jest.fn().mockResolvedValue(visiblePost),
    };
    const service = new CommentsService(
      neo4jService as unknown as Neo4jService,
      postsService as unknown as PostsService,
    );

    const result = await service.create('person-1', 'post-1', {
      content: 'Reply',
      parentCommentId: 'comment-1',
    });

    expect(query).toContain('CREATE (comment)-[:REPLY_TO');
    expect(parameters.parentCommentId).toBe('comment-1');
    expect(result.parentCommentId).toBe('comment-1');
  });

  it('prevents a non-author from deleting a comment', async () => {
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: () => 'another-person' }],
      }),
      executeWrite: jest.fn(),
    };
    const postsService = {
      getOne: jest.fn().mockResolvedValue(visiblePost),
    };
    const service = new CommentsService(
      neo4jService as unknown as Neo4jService,
      postsService as unknown as PostsService,
    );

    await expect(
      service.delete('person-1', 'post-1', 'comment-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(neo4jService.executeWrite).not.toHaveBeenCalled();
  });

  it('lists only visible comments with parameterized pagination', async () => {
    const executeRead = jest.fn().mockResolvedValue({ records: [] });
    const postsService = { getOne: jest.fn().mockResolvedValue(visiblePost) };
    const service = new CommentsService(
      { executeRead } as unknown as Neo4jService,
      postsService as unknown as PostsService,
    );

    await expect(
      service.list('person-1', 'post-1', { page: 3, limit: 10 }),
    ).resolves.toEqual([]);
    expect(executeRead).toHaveBeenCalledWith(
      expect.stringContaining(
        "coalesce(comment.moderationStatus, 'VISIBLE') = 'VISIBLE'",
      ),
      {
        currentPersonId: 'person-1',
        postId: 'post-1',
        skip: neo4j.int(20),
        limit: neo4j.int(10),
      },
    );
  });

  it('returns not found when an admin delete targets a missing comment', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [] });
    const service = new CommentsService(
      { executeWrite } as unknown as Neo4jService,
      {} as PostsService,
    );

    await expect(
      service.deleteByAdmin('missing-comment'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('DETACH DELETE comment'),
      { commentId: 'missing-comment' },
    );
  });
});
