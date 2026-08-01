import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { UploadsService } from '../uploads/uploads.service';
import { PostsService } from './posts.service';
import type { PostResponse } from './types/post.type';

const post: PostResponse = {
  postId: 'post-1',
  content: 'Test post',
  imageUrl: null,
  media: [],
  privacy: 'PUBLIC',
  createdAt: '2026-07-31T00:00:00Z',
  updatedAt: '2026-07-31T00:00:00Z',
  author: {
    personId: 'person-1',
    username: 'author',
    fullName: 'Post Author',
    avatarUrl: null,
  },
  likeCount: 0,
  commentCount: 0,
  repostCount: 0,
  shareCount: 0,
  likedByCurrentUser: false,
  repostedByCurrentUser: false,
  isAuthor: true,
};

describe('PostsService', () => {
  let deleteAsset: jest.Mock;
  let uploadsService: UploadsService;

  beforeEach(() => {
    deleteAsset = jest.fn().mockResolvedValue(undefined);
    uploadsService = { deleteAsset } as unknown as UploadsService;
  });

  it('rejects an empty update before querying Neo4j', async () => {
    const neo4jService = { executeRead: jest.fn(), executeWrite: jest.fn() };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );

    await expect(
      service.update('person-1', 'post-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(neo4jService.executeRead).not.toHaveBeenCalled();
    expect(neo4jService.executeWrite).not.toHaveBeenCalled();
  });

  it('prevents a non-author from updating a post', async () => {
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue({
        records: [{ get: () => 'another-person' }],
      }),
      executeWrite: jest.fn(),
    };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );

    await expect(
      service.update('person-1', 'post-1', { content: 'Forbidden update' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(neo4jService.executeWrite).not.toHaveBeenCalled();
  });

  it('uses MERGE and parameters for idempotent likes', async () => {
    let capturedQuery = '';
    const neo4jService = {
      executeWrite: jest.fn().mockImplementation((query: string) => {
        capturedQuery = query;
        return Promise.resolve({ records: [{}] });
      }),
    };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );
    jest.spyOn(service, 'getOne').mockResolvedValue(post);

    await expect(service.like('person-2', 'post-1')).resolves.toBe(post);
    expect(capturedQuery).toContain('MERGE (person)-[like:LIKES]->(post)');
    expect(neo4jService.executeWrite).toHaveBeenCalledWith(expect.any(String), {
      currentPersonId: 'person-2',
      postId: 'post-1',
    });
  });

  it('creates Media and HAS_MEDIA with Cypher parameters', async () => {
    let capturedQuery = '';
    let capturedParameters: Record<string, unknown> = {};
    const values = {
      post: {
        properties: {
          postId: 'post-1',
          content: 'Media post',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/asset.webp',
          privacy: 'PUBLIC',
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
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      shareCount: 0,
      likedByCurrentUser: false,
      repostedByCurrentUser: false,
      isAuthor: true,
      media: [
        {
          properties: {
            mediaId: 'media-1',
            publicId: 'misonet/posts/asset-1',
            secureUrl:
              'https://res.cloudinary.com/demo/image/upload/asset.webp',
            resourceType: 'image',
            format: 'webp',
            width: 1200,
            height: 800,
            duration: null,
            bytes: 4567,
          },
        },
      ],
    };
    const neo4jService = {
      executeWrite: jest.fn(
        (query: string, parameters: Record<string, unknown>) => {
          capturedQuery = query;
          capturedParameters = parameters;
          return Promise.resolve({
            records: [
              {
                get: (key: keyof typeof values) => values[key],
              },
            ],
          });
        },
      ),
    };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );

    const result = await service.create('person-1', {
      content: 'Media post',
      privacy: 'PUBLIC',
      media: {
        publicId: 'misonet/posts/asset-1',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/asset.webp',
        resourceType: 'image',
        format: 'webp',
        width: 1200,
        height: 800,
        duration: null,
        bytes: 4567,
      },
    });

    expect(capturedQuery).toContain('CREATE (media:Media');
    expect(capturedQuery).toContain('CREATE (post)-[:HAS_MEDIA');
    expect(capturedQuery).not.toContain('misonet/posts/asset-1');
    expect(capturedParameters).toMatchObject({
      mediaPublicId: 'misonet/posts/asset-1',
      mediaResourceType: 'image',
    });
    expect(result.media).toHaveLength(1);
  });

  it('deletes Cloudinary assets before deleting Media and Post', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [] });
    const neo4jService = {
      executeRead: jest.fn().mockResolvedValue({
        records: [
          {
            get: (key: string) =>
              key === 'authorPersonId'
                ? 'person-1'
                : [
                    {
                      publicId: 'misonet/posts/video-1',
                      resourceType: 'video',
                    },
                  ],
          },
        ],
      }),
      executeWrite,
    };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );

    await expect(service.delete('person-1', 'post-1')).resolves.toEqual({
      deleted: true,
      postId: 'post-1',
    });
    expect(deleteAsset).toHaveBeenCalledWith('misonet/posts/video-1', 'video');
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining(
        'FOREACH (comment IN comments | DETACH DELETE comment)',
      ),
      { currentPersonId: 'person-1', postId: 'post-1' },
    );
    expect(deleteAsset.mock.invocationCallOrder[0]).toBeLessThan(
      executeWrite.mock.invocationCallOrder[0],
    );
  });

  it('uses MERGE and parameters for idempotent reposts', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [{}] });
    const neo4jService = { executeWrite };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );
    jest.spyOn(service, 'getOne').mockResolvedValue(post);

    await expect(service.repost('person-2', 'post-1')).resolves.toBe(post);
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (person)-[repost:REPOSTED]->(post)'),
      { currentPersonId: 'person-2', postId: 'post-1' },
    );
  });

  it('records a parameterized share channel', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [{}] });
    const neo4jService = { executeWrite };
    const service = new PostsService(
      neo4jService as unknown as Neo4jService,
      uploadsService,
    );
    jest.spyOn(service, 'getOne').mockResolvedValue(post);

    await expect(
      service.share('person-2', 'post-1', { channel: 'NATIVE' }),
    ).resolves.toBe(post);
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('share.channel = $channel'),
      {
        currentPersonId: 'person-2',
        postId: 'post-1',
        channel: 'NATIVE',
      },
    );
  });
});
