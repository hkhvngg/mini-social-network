import { DateTime, Node } from 'neo4j-driver';
import type {
  AccountStatus,
  PersonAccount,
  PublicPerson,
  UserRole,
} from '../types/person.type';
import type {
  MeProfile,
  ProfileStats,
  PublicProfile,
} from '../types/person-public.type';
import type { RelationshipStatus } from '../types/relationship-status.type';

export function mapPersonNode(node: Node): PersonAccount {
  const properties = node.properties as Record<string, unknown>;

  return {
    personId: requireString(properties.personId, 'personId'),
    username: requireString(properties.username, 'username'),
    email: requireString(properties.email, 'email'),
    passwordHash: optionalString(properties.passwordHash),
    fullName: requireString(properties.fullName, 'fullName'),
    bio: optionalString(properties.bio) ?? '',
    avatarUrl: optionalString(properties.avatarUrl),
    isPrivate: properties.isPrivate === true,
    location: optionalString(properties.location) ?? '',
    interests: stringArray(properties.interests),
    role: userRole(properties.role),
    accountStatus: accountStatus(properties.accountStatus),
    suspendedUntil: optionalTemporal(properties.suspendedUntil),
    moderationReason: optionalString(properties.moderationReason) ?? '',
    createdAt: stringifyTemporal(properties.createdAt, 'createdAt'),
    updatedAt: stringifyTemporal(properties.updatedAt, 'updatedAt'),
  };
}

export function toPublicPerson(person: PersonAccount): PublicPerson {
  return {
    personId: person.personId,
    username: person.username,
    email: person.email,
    fullName: person.fullName,
    bio: person.bio,
    avatarUrl: person.avatarUrl,
    isPrivate: person.isPrivate,
    location: person.location,
    interests: person.interests,
    role: person.role,
    accountStatus: person.accountStatus,
    suspendedUntil: person.suspendedUntil,
    moderationReason: person.moderationReason,
    createdAt: person.createdAt,
  };
}

function userRole(value: unknown): UserRole {
  return value === 'ADMIN' ? 'ADMIN' : 'USER';
}

function accountStatus(value: unknown): AccountStatus {
  if (value === 'SUSPENDED' || value === 'BANNED') return value;
  return 'ACTIVE';
}

export function mapPublicProfileNode(
  node: Node,
  stats: ProfileStats,
  relationship: RelationshipStatus,
): PublicProfile {
  return {
    ...mapProfileBase(node),
    canViewConnections:
      !((node.properties as Record<string, unknown>).isPrivate === true) ||
      relationship.isSelf,
    stats,
    relationship,
  };
}

export function mapMeProfileNode(
  node: Node,
  stats: ProfileStats,
  relationship: RelationshipStatus,
): MeProfile {
  const properties = node.properties as Record<string, unknown>;

  return {
    ...mapProfileBase(node),
    canViewConnections: true,
    email: requireString(properties.email, 'email'),
    stats,
    relationship,
  };
}

function mapProfileBase(
  node: Node,
): Omit<PublicProfile, 'stats' | 'relationship' | 'canViewConnections'> {
  const properties = node.properties as Record<string, unknown>;
  const createdAt = stringifyTemporal(properties.createdAt, 'createdAt');

  return {
    personId: requireString(properties.personId, 'personId'),
    username: requireString(properties.username, 'username'),
    fullName: requireString(properties.fullName, 'fullName'),
    bio: optionalString(properties.bio) ?? '',
    avatarUrl: optionalString(properties.avatarUrl),
    isPrivate: properties.isPrivate === true,
    location: optionalString(properties.location) ?? '',
    interests: stringArray(properties.interests),
    createdAt,
    updatedAt: optionalTemporal(properties.updatedAt) ?? createdAt,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function requireString(value: unknown, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Person property ${propertyName} is invalid`);
  }

  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function stringifyTemporal(value: unknown, propertyName: string): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof DateTime) {
    return value.toString();
  }

  throw new Error(`Person property ${propertyName} is invalid`);
}

function optionalTemporal(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return stringifyTemporal(value, 'temporal');
}
