import type { RelationshipStatus } from './relationship-status.type';

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
  canViewConnections: boolean;
  createdAt: string;
  updatedAt: string;
  stats: ProfileStats;
  relationship: RelationshipStatus;
};

export type MeProfile = PublicProfile & { email: string };
