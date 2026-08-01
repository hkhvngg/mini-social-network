import type { RelationshipStatus } from './relationship-status.type';

export type UserSearchResult = {
  personId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  relationship: RelationshipStatus;
};
