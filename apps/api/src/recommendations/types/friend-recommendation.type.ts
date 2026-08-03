export type MutualFriend = {
  personId: string;
  username: string;
  fullName: string;
};

export type FriendRecommendation = {
  category: 'PEOPLE_YOU_MAY_KNOW' | 'FRIEND_SUGGESTION';
  personId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  location: string;
  mutualFriendCount: number;
  mutualFriends: MutualFriend[];
  sharedInterests: string[];
  sameLocation: boolean;
  recommendationScore: number;
  relationship: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isFriend: false;
  };
};

export type FriendRecommendationsResponse = {
  items: FriendRecommendation[];
};
