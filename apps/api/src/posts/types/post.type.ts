export const POST_PRIVACIES = ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const;

export type PostPrivacy = (typeof POST_PRIVACIES)[number];

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
  shareCount: number;
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
};

export type CommentResponse = {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  isAuthor: boolean;
};

export const SHARE_CHANNELS = ['COPY', 'NATIVE'] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];
