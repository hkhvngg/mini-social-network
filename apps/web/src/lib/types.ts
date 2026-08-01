export type AuthUser = {
  personId: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  createdAt: string;
};

export type AuthResponse = { accessToken: string; user: AuthUser };

export type ProfileStats = {
  friendCount: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
};

export type Relationship = {
  isSelf: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
};

export type Profile = Omit<AuthUser, "email"> & {
  email?: string;
  updatedAt: string;
  stats: ProfileStats;
  relationship: Relationship;
  canViewConnections: boolean;
};

export type UserSearchResult = {
  personId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  relationship: Relationship;
};

export type UploadedMedia = {
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "video";
  format: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  bytes: number;
};

export type PostMedia = UploadedMedia & { mediaId: string };

export type Post = {
  postId: string;
  content: string;
  imageUrl: string | null;
  media: PostMedia[];
  privacy: "PUBLIC" | "FRIENDS" | "PRIVATE";
  createdAt: string;
  updatedAt: string;
  author: {
    personId: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  commentCount: number;
  repostCount: number;
  shareCount: number;
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
};

export type Comment = {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Post['author'];
  isAuthor: boolean;
};

export type Connection = {
  personId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  connectedAt: string | null;
};

export type Recommendation = {
  personId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriendCount: number;
  mutualFriends: Array<{
    personId: string;
    username: string;
    fullName: string;
  }>;
  relationship: Omit<Relationship, "isSelf">;
};
