import type { PostAuthor } from '../../posts/types/post.type';

export const NOTIFICATION_TYPES = [
  'FOLLOW',
  'FRIEND',
  'LIKE',
  'COMMENT',
  'REPLY',
  'REPOST',
  'SHARE',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationResponse = {
  notificationId: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
  actor: PostAuthor;
  postId: string | null;
  commentId: string | null;
  postPreview: string | null;
  commentPreview: string | null;
};
