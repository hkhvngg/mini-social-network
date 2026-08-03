import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('maps all dashboard counters from Neo4j integers', async () => {
    const values = {
      users: 12,
      activeUsers: 9,
      suspendedUsers: 2,
      bannedUsers: 1,
      posts: 24,
      reposts: 5,
      comments: 30,
      reports: 7,
      openReports: 3,
      follows: 40,
      friends: 15,
      likes: 80,
    };
    const record = {
      get: (key: keyof typeof values) => neo4j.int(values[key]),
    };
    const service = new AdminService({
      executeRead: jest.fn().mockResolvedValue({ records: [record] }),
    } as unknown as Neo4jService);

    await expect(service.overview()).resolves.toEqual(values);
  });

  it('paginates the user list with parameterized skip and limit', async () => {
    const executeRead = jest
      .fn()
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [{ get: () => neo4j.int(0) }] });
    const service = new AdminService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(
      service.listUsers({ q: '', page: 2, limit: 20 }),
    ).resolves.toEqual({ items: [], total: 0, page: 2, limit: 20 });
    expect(executeRead).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SKIP $skip LIMIT $limit'),
      expect.objectContaining({ skip: neo4j.int(20), limit: neo4j.int(20) }),
    );
  });

  it('prevents an administrator from suspending their own account', async () => {
    const executeWrite = jest.fn();
    const service = new AdminService({
      executeWrite,
    } as unknown as Neo4jService);

    await expect(
      service.updateAccountStatus('admin-1', 'admin-1', {
        status: 'SUSPENDED',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(executeWrite).not.toHaveBeenCalled();
  });

  it('prevents an administrator from demoting their own account', async () => {
    const service = new AdminService({} as Neo4jService);

    await expect(
      service.updateUserRole('admin-1', 'admin-1', { role: 'USER' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when moderating content that does not exist', async () => {
    const service = new AdminService({
      executeWrite: jest.fn().mockResolvedValue({ records: [] }),
    } as unknown as Neo4jService);

    await expect(
      service.moderateContent('admin-1', 'POST', 'missing-post', {
        status: 'HIDDEN',
        reason: 'Review required',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns not found for a missing report detail', async () => {
    const service = new AdminService({
      executeRead: jest.fn().mockResolvedValue({ records: [] }),
    } as unknown as Neo4jService);

    await expect(service.getReport('missing-report')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps dashboard database failures to ServiceUnavailableException', async () => {
    const service = new AdminService({
      executeRead: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Neo4jService);

    await expect(service.overview()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
