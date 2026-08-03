export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type PersonAccount = {
  personId: string;
  username: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  location: string;
  interests: string[];
  role: UserRole;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  moderationReason: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicPerson = Omit<PersonAccount, 'passwordHash' | 'updatedAt'>;

export type CreatePersonInput = {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  location: string;
  interests: string[];
};
