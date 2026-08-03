import neo4j from 'neo4j-driver';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('lists notifications with parameterized pagination', async () => {
    const executeRead = jest.fn().mockResolvedValue({ records: [] });
    const service = new NotificationsService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(
      service.list('person-1', { page: 2, limit: 10, unreadOnly: true }),
    ).resolves.toEqual([]);

    expect(executeRead).toHaveBeenCalledWith(
      expect.stringContaining('WHERE NOT $unreadOnly'),
      {
        currentPersonId: 'person-1',
        unreadOnly: true,
        skip: neo4j.int(10),
        limit: neo4j.int(10),
      },
    );
  });

  it('marks all unread notifications in one Cypher write', async () => {
    const executeWrite = jest.fn().mockResolvedValue({
      records: [{ get: () => neo4j.int(3) }],
    });
    const service = new NotificationsService({
      executeWrite,
    } as unknown as Neo4jService);

    await expect(service.markAllRead('person-1')).resolves.toEqual({
      updatedCount: 3,
    });
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('SET notification.readAt = datetime()'),
      { currentPersonId: 'person-1' },
    );
  });

  it('creates both notification uniqueness constraints on startup', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [] });
    const service = new NotificationsService({
      executeWrite,
    } as unknown as Neo4jService);

    await service.onModuleInit();

    expect(executeWrite).toHaveBeenCalledTimes(2);
    expect(executeWrite).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('notification_id_unique'),
    );
    expect(executeWrite).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('notification_key_unique'),
    );
  });

  it('returns a safe unread count from a Neo4j integer', async () => {
    const executeRead = jest.fn().mockResolvedValue({
      records: [{ get: () => neo4j.int(7) }],
    });
    const service = new NotificationsService({
      executeRead,
    } as unknown as Neo4jService);

    await expect(service.getUnreadCount('person-1')).resolves.toEqual({
      unreadCount: 7,
    });
    expect(executeRead).toHaveBeenCalledWith(
      expect.stringContaining('notification.readAt IS NULL'),
      { currentPersonId: 'person-1' },
    );
  });

  it('does not let a user mark a missing or foreign notification as read', async () => {
    const executeWrite = jest.fn().mockResolvedValue({ records: [] });
    const service = new NotificationsService({
      executeWrite,
    } as unknown as Neo4jService);

    await expect(
      service.markRead('person-1', 'notification-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(executeWrite).toHaveBeenCalledWith(
      expect.stringContaining('personId: $currentPersonId'),
      { currentPersonId: 'person-1', notificationId: 'notification-404' },
    );
  });

  it('maps database failures to a service-unavailable response', async () => {
    const service = new NotificationsService({
      executeRead: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Neo4jService);

    await expect(
      service.list('person-1', { page: 1, limit: 10, unreadOnly: false }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
