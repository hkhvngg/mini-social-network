export type PersonAccount = {
  personId: string;
  username: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicPerson = Omit<PersonAccount, 'passwordHash' | 'updatedAt'>;

export type CreatePersonInput = {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
};
