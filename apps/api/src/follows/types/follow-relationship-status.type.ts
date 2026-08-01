export type FollowRelationshipStatus = {
  targetPersonId: string;
  isSelf: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  followedAt: string | null;
  friendSince: string | null;
};
