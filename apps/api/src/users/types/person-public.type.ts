import type { RelationshipStatus } from './relationship-status.type';
import type { ProfileField } from './profile-field.type';

export type ProfileStats = {
  friendCount: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
};

export type PublicProfile = {
  personId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  location: string;
  interests: string[];
  profileFields: ProfileField[];
  canViewConnections: boolean;
  createdAt: string;
  updatedAt: string;
  stats: ProfileStats;
  relationship: RelationshipStatus;
};

export type MeProfile = PublicProfile & { email: string };
