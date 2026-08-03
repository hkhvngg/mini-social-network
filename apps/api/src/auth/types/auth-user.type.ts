import type { AccountStatus, UserRole } from '../../users/types/person.type';

export type AuthUser = {
  personId: string;
  username: string;
  role: UserRole;
  accountStatus: AccountStatus;
};
