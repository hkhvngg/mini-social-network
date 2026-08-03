export type AuthUser = {
  personId: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  location: string;
  interests: string[];
  role: "USER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
  suspendedUntil: string | null;
  moderationReason: string;
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
export type PostPrivacy = "PUBLIC" | "FRIENDS" | "PRIVATE";

export type RepostSource = {
  postId: string;
  content: string;
  imageUrl: string | null;
  media: PostMedia[];
  privacy: PostPrivacy;
  createdAt: string;
  author: Post["author"];
};

export type Post = {
  postId: string;
  content: string;
  imageUrl: string | null;
  media: PostMedia[];
  privacy: PostPrivacy;
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
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  isAuthor: boolean;
  repostOf: RepostSource | null;
};

export type Comment = {
  commentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Post['author'];
  isAuthor: boolean;
  parentCommentId: string | null;
};

export type NotificationType =
  | "FOLLOW"
  | "FRIEND"
  | "LIKE"
  | "COMMENT"
  | "REPLY"
  | "REPOST"
  | "SHARE";

export type Notification = {
  notificationId: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
  actor: Post["author"];
  postId: string | null;
  commentId: string | null;
  postPreview: string | null;
  commentPreview: string | null;
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
  category: "PEOPLE_YOU_MAY_KNOW" | "FRIEND_SUGGESTION";
  personId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  location: string;
  mutualFriendCount: number;
  mutualFriends: Array<{
    personId: string;
    username: string;
    fullName: string;
  }>;
  sharedInterests: string[];
  sameLocation: boolean;
  recommendationScore: number;
  relationship: Omit<Relationship, "isSelf">;
};

export type AdminOverview = {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  posts: number;
  reposts: number;
  comments: number;
  reports: number;
  openReports: number;
  follows: number;
  friends: number;
  likes: number;
};

export type AdminUser = {
  personId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
  suspendedUntil: string | null;
  moderationReason: string;
  createdAt: string;
};

export type AdminReport = {
  reportId: string;
  targetType: "PERSON" | "POST" | "COMMENT";
  targetId: string;
  targetPreview: string;
  targetContent: string;
  targetPostId: string | null;
  targetMediaUrl: string | null;
  targetMediaType: "image" | "video" | null;
  targetAuthor: { personId: string; username: string } | null;
  reason: string;
  details: string;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  createdAt: string;
  assignedAt: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string;
  reporter: { personId: string; username: string; fullName: string };
  assignee: { personId: string; username: string; fullName: string } | null;
};

export type AdminContent = {
  contentId: string;
  type: "POST" | "COMMENT";
  content: string;
  moderationStatus: "VISIBLE" | "HIDDEN" | "REMOVED";
  moderationReason: string;
  createdAt: string;
  parentPostId: string | null;
  author: { personId: string; username: string; fullName: string } | null;
};

export type AdminAudit = {
  auditId: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string;
  beforeJson: string;
  afterJson: string;
  createdAt: string;
  actor: { personId: string; username: string; fullName: string };
};

export type AdminRanking = {
  personId: string;
  username: string;
  fullName: string;
  score: number;
};

export type AdminGraphOverview = {
  topFollowers: AdminRanking[];
  topFriends: AdminRanking[];
  topLiked: AdminRanking[];
  topReported: AdminRanking[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
