export const POST_PRIVACIES = ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const;

export type PostPrivacy = (typeof POST_PRIVACIES)[number];

export const MODERATION_STATUSES = ['VISIBLE', 'HIDDEN', 'REMOVED'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type PostAuthor = {
  personId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
};

export type PostMedia = {
  mediaId: string;
  publicId: string;
  secureUrl: string;
  resourceType: 'image' | 'video';
  format: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  bytes: number;
};

export type RepostSource = {
  postId: string;
  content: string;
  imageUrl: string | null;
  media: PostMedia[];
  privacy: PostPrivacy;
  createdAt: string;
  author: PostAuthor;
};

export type PostResponse = {
  postId: string;
  content: string;
  imageUrl: string | null;
  media: PostMedia[];
  privacy: PostPrivacy;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
  repostOf: RepostSource | null;
};

export type CommentResponse = {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  isAuthor: boolean;
  parentCommentId: string | null;
};
