import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const reportNode = {
    properties: {
      reportId: 'report-1',
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'SPAM',
      details: 'Repeated advertising',
      status: 'PENDING',
      createdAt: '2026-08-03T00:00:00Z',
    },
  } as unknown as Node;

  it('creates a report linked to its reporter and target', async () => {
    const executeRead = jest
      .fn()
      .mockResolvedValueOnce({ records: [{}] })
      .mockResolvedValueOnce({ records: [] });
    const executeWrite = jest.fn().mockResolvedValue({
      records: [{ get: () => reportNode }],
    });
    const service = new ReportsService({
      executeRead,
      executeWrite,
    } as unknown as Neo4jService);

    await expect(
      service.create('person-1', {
        targetType: 'POST',
        targetId: 'post-1',
        reason: 'SPAM',
        details: 'Repeated advertising',
      }),
    ).resolves.toMatchObject({ reportId: 'report-1', status: 'PENDING' });
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('CREATE (report)-[:TARGETS]->(target)'),
      expect.objectContaining({ reporterPersonId: 'person-1' }),
    );
  });

  it('rejects another pending report for the same target', async () => {
    const executeRead = jest
      .fn()
      .mockResolvedValueOnce({ records: [{}] })
      .mockResolvedValueOnce({ records: [{}] });
    const service = new ReportsService({
      executeRead,
      executeWrite: jest.fn(),
    } as unknown as Neo4jService);

    await expect(
      service.create('person-1', {
        targetType: 'POST',
        targetId: 'post-1',
        reason: 'SPAM',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a post report when the target is missing or not visible', async () => {
    const executeRead = jest.fn().mockResolvedValue({ records: [] });
    const service = new ReportsService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(
      service.create('person-1', {
        targetType: 'POST',
        targetId: 'private-post',
        reason: 'OTHER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(executeRead).toHaveBeenCalledWith(
      expect.stringContaining("target.privacy = 'FRIENDS'"),
      { reporterPersonId: 'person-1', targetId: 'private-post' },
    );
  });

  it('prevents a person from reporting their own profile', async () => {
    let capturedQuery = '';
    const executeRead = jest.fn().mockImplementation((query: string) => {
      capturedQuery = query;
      return Promise.resolve({ records: [] });
    });
    const service = new ReportsService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(
      service.create('person-1', {
        targetType: 'PERSON',
        targetId: 'person-1',
        reason: 'OTHER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(capturedQuery).toContain('target <> reporter');
  });

  it('checks both comment and parent-post moderation before reporting a comment', async () => {
    let capturedQuery = '';
    const executeRead = jest.fn().mockImplementation((query: string) => {
      capturedQuery = query;
      return Promise.resolve({ records: [] });
    });
    const service = new ReportsService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(
      service.create('person-1', {
        targetType: 'COMMENT',
        targetId: 'comment-1',
        reason: 'HARASSMENT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(capturedQuery).toContain(
      "coalesce(target.moderationStatus, 'VISIBLE')",
    );
    expect(capturedQuery).toContain(
      "coalesce(post.moderationStatus, 'VISIBLE')",
    );
    expect(capturedQuery).toContain(
      'EXISTS { MATCH (reporter)-[:FRIEND]-(postAuthor) }',
    );
  });
});
