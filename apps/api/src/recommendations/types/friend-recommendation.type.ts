export type MutualFriend = {
  personId: string;
  username: string;
  fullName: string;
};

export type FriendRecommendation = {
  personId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriendCount: number;
  mutualFriends: MutualFriend[];
  relationship: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isFriend: false;
  };
};

export type FriendRecommendationsResponse = {
  items: FriendRecommendation[];
};
