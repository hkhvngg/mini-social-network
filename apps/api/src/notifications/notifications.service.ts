import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import neo4j, { DateTime, Integer, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { PostAuthor } from '../posts/types/post.type';
import type { NotificationPaginationQueryDto } from './dto/notification-pagination-query.dto';
import type {
  NotificationResponse,
  NotificationType,
} from './types/notification.type';

type NotificationRecord = {
  notification: Node;
  actor: Node;
  postId: string | null;
  commentId: string | null;
  postPreview: string | null;
  commentPreview: string | null;
};

type CountRecord = { unreadCount: Integer | number };

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private readonly neo4jService: Neo4jService) {}

  async onModuleInit(): Promise<void> {
    await this.neo4jService.executeWrite(
      `CREATE CONSTRAINT notification_id_unique IF NOT EXISTS
       FOR (notification:Notification)
       REQUIRE notification.notificationId IS UNIQUE`,
    );
    await this.neo4jService.executeWrite(
      `CREATE CONSTRAINT notification_key_unique IF NOT EXISTS
       FOR (notification:Notification)
       REQUIRE notification.notificationKey IS UNIQUE`,
    );
  }

  async list(
    currentPersonId: string,
    pagination: NotificationPaginationQueryDto,
  ): Promise<NotificationResponse[]> {
    const skip = (pagination.page - 1) * pagination.limit;
    try {
      const result = await this.neo4jService.executeRead<NotificationRecord>(
        `MATCH (notification:Notification)-[:FOR]->
               (:Person {personId: $currentPersonId})
         MATCH (actor:Person)-[:TRIGGERED]->(notification)
         WHERE NOT $unreadOnly OR notification.readAt IS NULL
         OPTIONAL MATCH (notification)-[:ABOUT_POST]->(post:Post)
         OPTIONAL MATCH (notification)-[:ABOUT_COMMENT]->(comment:Comment)
         RETURN notification, actor, post.postId AS postId,
                comment.commentId AS commentId,
                post.content AS postPreview,
                comment.content AS commentPreview
         ORDER BY notification.createdAt DESC, notification.notificationId DESC
         SKIP $skip LIMIT $limit`,
        {
          currentPersonId,
          unreadOnly: pagination.unreadOnly,
          skip: neo4j.int(skip),
          limit: neo4j.int(pagination.limit),
        },
      );
      return result.records.map((record) => this.mapNotification(record));
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async getUnreadCount(
    currentPersonId: string,
  ): Promise<{ unreadCount: number }> {
    try {
      const result = await this.neo4jService.executeRead<CountRecord>(
        `MATCH (notification:Notification)-[:FOR]->
               (:Person {personId: $currentPersonId})
         WHERE notification.readAt IS NULL
         RETURN count(notification) AS unreadCount`,
        { currentPersonId },
      );
      const value = result.records[0]?.get('unreadCount') ?? 0;
      return { unreadCount: this.toSafeCount(value) };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async markRead(
    currentPersonId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    try {
      const result = await this.neo4jService.executeWrite<NotificationRecord>(
        `MATCH (notification:Notification {notificationId: $notificationId})-[:FOR]->
               (:Person {personId: $currentPersonId})
         MATCH (actor:Person)-[:TRIGGERED]->(notification)
         SET notification.readAt = coalesce(notification.readAt, datetime())
         OPTIONAL MATCH (notification)-[:ABOUT_POST]->(post:Post)
         OPTIONAL MATCH (notification)-[:ABOUT_COMMENT]->(comment:Comment)
         RETURN notification, actor, post.postId AS postId,
                comment.commentId AS commentId,
                post.content AS postPreview,
                comment.content AS commentPreview`,
        { currentPersonId, notificationId },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Notification not found');
      return this.mapNotification(record);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async markAllRead(
    currentPersonId: string,
  ): Promise<{ updatedCount: number }> {
    try {
      const result = await this.neo4jService.executeWrite<CountRecord>(
        `MATCH (notification:Notification)-[:FOR]->
               (:Person {personId: $currentPersonId})
         WHERE notification.readAt IS NULL
         SET notification.readAt = datetime()
         RETURN count(notification) AS unreadCount`,
        { currentPersonId },
      );
      return {
        updatedCount: this.toSafeCount(
          result.records[0]?.get('unreadCount') ?? 0,
        ),
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private mapNotification(record: {
    get<Key extends keyof NotificationRecord>(
      key: Key,
    ): NotificationRecord[Key];
  }): NotificationResponse {
    const notification = record.get('notification').properties as Record<
      string,
      unknown
    >;
    const readAt = this.optionalTemporal(notification.readAt);
    return {
      notificationId: this.requireString(
        notification.notificationId,
        'notificationId',
      ),
      type: this.requireType(notification.type),
      createdAt: this.requireTemporal(notification.createdAt, 'createdAt'),
      readAt,
      isRead: readAt !== null,
      actor: this.mapActor(record.get('actor')),
      postId: record.get('postId'),
      commentId: record.get('commentId'),
      postPreview: record.get('postPreview'),
      commentPreview: record.get('commentPreview'),
    };
  }

  private mapActor(node: Node): PostAuthor {
    const actor = node.properties as Record<string, unknown>;
    return {
      personId: this.requireString(actor.personId, 'actor.personId'),
      username: this.requireString(actor.username, 'actor.username'),
      fullName: this.requireString(actor.fullName, 'actor.fullName'),
      avatarUrl: typeof actor.avatarUrl === 'string' ? actor.avatarUrl : null,
    };
  }

  private requireType(value: unknown): NotificationType {
    if (
      value === 'FOLLOW' ||
      value === 'FRIEND' ||
      value === 'LIKE' ||
      value === 'COMMENT' ||
      value === 'REPLY' ||
      value === 'REPOST' ||
      value === 'SHARE'
    ) {
      return value;
    }
    throw new ServiceUnavailableException(
      'Database returned invalid notification type',
    );
  }

  private requireString(value: unknown, name: string): string {
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException(
        `Database returned invalid ${name}`,
      );
    }
    return value;
  }

  private requireTemporal(value: unknown, name: string): string {
    if (typeof value === 'string') return value;
    if (value instanceof DateTime) return value.toString();
    throw new ServiceUnavailableException(`Database returned invalid ${name}`);
  }

  private optionalTemporal(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    return this.requireTemporal(value, 'readAt');
  }

  private toSafeCount(value: Integer | number): number {
    const count = neo4j.isInt(value) ? value.toNumber() : value;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new ServiceUnavailableException('Database returned invalid count');
    }
    return count;
  }
}
