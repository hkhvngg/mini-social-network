import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import neo4j, { DateTime, Integer, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { ModerationStatus } from '../posts/types/post.type';
import type { ReportStatus } from '../reports/types/report.type';
import type { AccountStatus, UserRole } from '../users/types/person.type';
import {
  ADMIN_AUDIT_COUNT_QUERY,
  ADMIN_AUDIT_LIST_QUERY,
  ADMIN_GRAPH_OVERVIEW_QUERY,
  ADMIN_OVERVIEW_QUERY,
  ADMIN_REPORT_BY_ID_QUERY,
  ADMIN_USER_BY_ID_QUERY,
  ASSIGN_REPORT_QUERY,
  RESOLVE_REPORT_QUERY,
  UPDATE_ACCOUNT_STATUS_QUERY,
  UPDATE_USER_ROLE_QUERY,
  adminContentQueries,
  adminReportQueries,
  adminUserQueries,
  moderateContentQuery,
} from './cypher/admin.queries';
import type { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import type { AdminContentQueryDto } from './dto/admin-content-query.dto';
import type { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import type { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import type { ModerateContentDto } from './dto/moderate-content.dto';
import type { ResolveReportDto } from './dto/resolve-report.dto';
import type { TopQueryDto } from './dto/top-query.dto';
import type { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';

type CountRecord = { total: Integer | number };
type UserRecord = { person: Node };
type ReportRecord = {
  report: Node;
  reporter: Node;
  target: Node;
  targetAuthor: Node | null;
  targetPost: Node | null;
  targetMediaUrl: string | null;
  targetMediaType: string | null;
  assignee: Node | null;
};
type ContentRecord = {
  content: Node;
  author: Node | null;
  parentPost: Node | null;
};
type AuditRecord = { audit: Node; actor: Node };
type OverviewRecord = Record<keyof AdminOverview, Integer | number>;

export type AdminOverview = {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  posts: number;
  reposts: number;
  comments: number;
  reports: number;
  openReports: number;
  follows: number;
  friends: number;
  likes: number;
};

export type AdminUser = {
  personId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  moderationReason: string;
  createdAt: string;
};

export type AdminReport = {
  reportId: string;
  targetType: 'PERSON' | 'POST' | 'COMMENT';
  targetId: string;
  targetPreview: string;
  targetContent: string;
  targetPostId: string | null;
  targetMediaUrl: string | null;
  targetMediaType: 'image' | 'video' | null;
  targetAuthor: { personId: string; username: string } | null;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
  assignedAt: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string;
  reporter: { personId: string; username: string; fullName: string };
  assignee: { personId: string; username: string; fullName: string } | null;
};

export type AdminContent = {
  contentId: string;
  type: 'POST' | 'COMMENT';
  content: string;
  moderationStatus: ModerationStatus;
  moderationReason: string;
  createdAt: string;
  parentPostId: string | null;
  author: { personId: string; username: string; fullName: string } | null;
};

export type AdminAudit = {
  auditId: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string;
  beforeJson: string;
  afterJson: string;
  createdAt: string;
  actor: { personId: string; username: string; fullName: string };
};

type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

@Injectable()
export class AdminService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async overview(): Promise<AdminOverview> {
    try {
      const result =
        await this.neo4jService.executeRead<OverviewRecord>(
          ADMIN_OVERVIEW_QUERY,
        );
      const record = result.records[0];
      if (!record) throw new Error('No overview record');
      const keys = [
        'users',
        'activeUsers',
        'suspendedUsers',
        'bannedUsers',
        'posts',
        'reposts',
        'comments',
        'reports',
        'openReports',
        'follows',
        'friends',
        'likes',
      ] as const;
      return Object.fromEntries(
        keys.map((key) => [key, this.count(record.get(key))]),
      ) as AdminOverview;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async listUsers(query: AdminUsersQueryDto): Promise<Paginated<AdminUser>> {
    const search = this.fulltextSearch(query.q);
    const parameters = {
      search,
      status: query.status ?? null,
      role: query.role ?? null,
      skip: neo4j.int((query.page - 1) * query.limit),
      limit: neo4j.int(query.limit),
    };
    const queries = adminUserQueries(
      Boolean(search),
      Boolean(query.status),
      Boolean(query.role),
    );
    try {
      const [itemsResult, countResult] = await Promise.all([
        this.neo4jService.executeRead<UserRecord>(queries.list, parameters),
        this.neo4jService.executeRead<CountRecord>(queries.count, parameters),
      ]);
      return {
        items: itemsResult.records.map((record) =>
          this.mapUser(record.get('person')),
        ),
        total: this.count(countResult.records[0]?.get('total') ?? 0),
        page: query.page,
        limit: query.limit,
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async updateAccountStatus(
    adminPersonId: string,
    targetPersonId: string,
    input: UpdateAccountStatusDto,
  ): Promise<AdminUser> {
    if (adminPersonId === targetPersonId) {
      throw new BadRequestException(
        'You cannot change your own account status',
      );
    }
    const before = await this.findUser(targetPersonId);
    const after = {
      accountStatus: input.status,
      suspendedUntil:
        input.status === 'SUSPENDED' ? (input.suspendedUntil ?? null) : null,
      moderationReason: input.note?.trim() ?? '',
    };
    const action: Record<AccountStatus, string> = {
      ACTIVE:
        before.accountStatus === 'BANNED' ? 'UNBAN_USER' : 'UNSUSPEND_USER',
      SUSPENDED: 'SUSPEND_USER',
      BANNED: 'BAN_USER',
    };
    try {
      const result = await this.neo4jService.executeWrite<UserRecord>(
        UPDATE_ACCOUNT_STATUS_QUERY,
        {
          adminPersonId,
          targetPersonId,
          status: input.status,
          suspendedUntil: after.suspendedUntil,
          note: after.moderationReason,
          auditId: randomUUID(),
          action: action[input.status],
          beforeJson: JSON.stringify({
            accountStatus: before.accountStatus,
            suspendedUntil: before.suspendedUntil,
            moderationReason: before.moderationReason,
          }),
          afterJson: JSON.stringify(after),
        },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('User not found');
      return this.mapUser(record.get('person'));
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  async updateUserRole(
    adminPersonId: string,
    targetPersonId: string,
    input: UpdateUserRoleDto,
  ): Promise<AdminUser> {
    if (adminPersonId === targetPersonId && input.role !== 'ADMIN') {
      throw new BadRequestException('You cannot demote your own account');
    }
    const before = await this.findUser(targetPersonId);
    try {
      const result = await this.neo4jService.executeWrite<UserRecord>(
        UPDATE_USER_ROLE_QUERY,
        {
          adminPersonId,
          targetPersonId,
          role: input.role,
          note: input.note?.trim() ?? '',
          auditId: randomUUID(),
          beforeJson: JSON.stringify({ role: before.role }),
          afterJson: JSON.stringify({ role: input.role }),
        },
      );
      const record = result.records[0];
      if (!record) {
        throw new ConflictException('The last administrator cannot be demoted');
      }
      return this.mapUser(record.get('person'));
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  async listContent(
    query: AdminContentQueryDto,
  ): Promise<Paginated<AdminContent>> {
    const search = this.fulltextSearch(query.q);
    const queries = adminContentQueries(
      query.type,
      Boolean(search),
      Boolean(query.status),
    );
    const parameters = {
      search,
      status: query.status ?? null,
      skip: neo4j.int((query.page - 1) * query.limit),
      limit: neo4j.int(query.limit),
    };
    try {
      const [itemsResult, countResult] = await Promise.all([
        this.neo4jService.executeRead<ContentRecord>(queries.list, parameters),
        this.neo4jService.executeRead<CountRecord>(queries.count, parameters),
      ]);
      return {
        items: itemsResult.records.map((record) =>
          this.mapContent(record, query.type),
        ),
        total: this.count(countResult.records[0]?.get('total') ?? 0),
        page: query.page,
        limit: query.limit,
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async moderateContent(
    adminPersonId: string,
    type: 'POST' | 'COMMENT',
    contentId: string,
    input: ModerateContentDto,
  ): Promise<{
    contentId: string;
    type: 'POST' | 'COMMENT';
    status: ModerationStatus;
  }> {
    const actionByStatus: Record<ModerationStatus, string> = {
      VISIBLE: 'RESTORE_CONTENT',
      HIDDEN: 'HIDE_CONTENT',
      REMOVED: 'REMOVE_CONTENT',
    };
    try {
      const result = await this.neo4jService.executeWrite(
        moderateContentQuery(type),
        {
          adminPersonId,
          contentId,
          status: input.status,
          reason: input.reason?.trim() ?? '',
          targetType: type,
          action: `${actionByStatus[input.status]}_${type}`,
          auditId: randomUUID(),
          afterJson: JSON.stringify({
            moderationStatus: input.status,
            moderationReason: input.reason?.trim() ?? '',
          }),
        },
      );
      if (!result.records[0]) throw new NotFoundException(`${type} not found`);
      return { contentId, type, status: input.status };
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  async listReports(
    query: AdminReportsQueryDto,
  ): Promise<Paginated<AdminReport>> {
    const parameters = {
      status: query.status ?? null,
      skip: neo4j.int((query.page - 1) * query.limit),
      limit: neo4j.int(query.limit),
    };
    const queries = adminReportQueries(Boolean(query.status));
    try {
      const [itemsResult, countResult] = await Promise.all([
        this.neo4jService.executeRead<ReportRecord>(queries.list, parameters),
        this.neo4jService.executeRead<CountRecord>(queries.count, parameters),
      ]);
      return {
        items: itemsResult.records.map((record) => this.mapReport(record)),
        total: this.count(countResult.records[0]?.get('total') ?? 0),
        page: query.page,
        limit: query.limit,
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  getReport(reportId: string): Promise<AdminReport> {
    return this.findReport(reportId);
  }

  async assignReport(
    adminPersonId: string,
    reportId: string,
  ): Promise<AdminReport> {
    const before = await this.findReport(reportId);
    try {
      const result = await this.neo4jService.executeWrite(ASSIGN_REPORT_QUERY, {
        adminPersonId,
        reportId,
        auditId: randomUUID(),
        beforeJson: JSON.stringify({
          status: before.status,
          assignee: before.assignee?.personId ?? null,
        }),
        afterJson: JSON.stringify({
          status: 'IN_REVIEW',
          assignedToPersonId: adminPersonId,
        }),
      });
      if (!result.records[0]) {
        throw new ConflictException(
          'Report is closed or assigned to another admin',
        );
      }
      return this.findReport(reportId);
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  async resolveReport(
    adminPersonId: string,
    reportId: string,
    input: ResolveReportDto,
  ): Promise<AdminReport> {
    const before = await this.findReport(reportId);
    try {
      const result = await this.neo4jService.executeWrite<ReportRecord>(
        RESOLVE_REPORT_QUERY,
        {
          adminPersonId,
          reportId,
          status: input.status,
          note: input.note?.trim() ?? '',
          action:
            input.status === 'RESOLVED' ? 'RESOLVE_REPORT' : 'REJECT_REPORT',
          auditId: randomUUID(),
          beforeJson: JSON.stringify({
            status: before.status,
            assignee: before.assignee?.personId ?? null,
          }),
          afterJson: JSON.stringify({
            status: input.status,
            resolutionNote: input.note?.trim() ?? '',
          }),
        },
      );
      const record = result.records[0];
      if (!record) {
        throw new ConflictException(
          'Report is closed or assigned to another admin',
        );
      }
      return this.mapReport(record);
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  async graphOverview(query: TopQueryDto) {
    try {
      const result = await this.neo4jService.executeRead(
        ADMIN_GRAPH_OVERVIEW_QUERY,
        { limit: neo4j.int(query.limit) },
      );
      const record = result.records[0];
      if (!record) throw new Error('No graph overview record');
      return {
        topFollowers: this.mapRanking(record.get('topFollowers')),
        topFriends: this.mapRanking(record.get('topFriends')),
        topLiked: this.mapRanking(record.get('topLiked')),
        topReported: this.mapRanking(record.get('topReported')),
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async listAudit(query: AdminAuditQueryDto): Promise<Paginated<AdminAudit>> {
    const parameters = {
      action: query.action ?? null,
      targetType: query.targetType ?? null,
      skip: neo4j.int((query.page - 1) * query.limit),
      limit: neo4j.int(query.limit),
    };
    try {
      const [itemsResult, countResult] = await Promise.all([
        this.neo4jService.executeRead<AuditRecord>(
          ADMIN_AUDIT_LIST_QUERY,
          parameters,
        ),
        this.neo4jService.executeRead<CountRecord>(
          ADMIN_AUDIT_COUNT_QUERY,
          parameters,
        ),
      ]);
      return {
        items: itemsResult.records.map((record) => this.mapAudit(record)),
        total: this.count(countResult.records[0]?.get('total') ?? 0),
        page: query.page,
        limit: query.limit,
      };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private async findUser(personId: string): Promise<AdminUser> {
    try {
      const result = await this.neo4jService.executeRead<UserRecord>(
        ADMIN_USER_BY_ID_QUERY,
        { personId },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('User not found');
      return this.mapUser(record.get('person'));
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  private async findReport(reportId: string): Promise<AdminReport> {
    try {
      const result = await this.neo4jService.executeRead<ReportRecord>(
        ADMIN_REPORT_BY_ID_QUERY,
        { reportId },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Report not found');
      return this.mapReport(record);
    } catch (error) {
      this.rethrowKnown(error);
    }
  }

  private mapUser(node: Node): AdminUser {
    const value = node.properties as Record<string, unknown>;
    return {
      personId: this.string(value.personId),
      username: this.string(value.username),
      email: this.string(value.email),
      fullName: this.string(value.fullName),
      avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : null,
      role: value.role === 'ADMIN' ? 'ADMIN' : 'USER',
      accountStatus:
        value.accountStatus === 'SUSPENDED' || value.accountStatus === 'BANNED'
          ? value.accountStatus
          : 'ACTIVE',
      suspendedUntil: value.suspendedUntil
        ? this.temporal(value.suspendedUntil)
        : null,
      moderationReason: this.optionalString(value.moderationReason),
      createdAt: this.temporal(value.createdAt),
    };
  }

  private mapReport(record: {
    get<Key extends keyof ReportRecord>(key: Key): ReportRecord[Key];
  }): AdminReport {
    const report = record.get('report').properties as Record<string, unknown>;
    const reporter = record.get('reporter').properties as Record<
      string,
      unknown
    >;
    const target = record.get('target').properties as Record<string, unknown>;
    const author = record.get('targetAuthor')?.properties;
    const targetPost = record.get('targetPost')?.properties;
    const mediaUrl = record.get('targetMediaUrl');
    const mediaType = record.get('targetMediaType');
    const assignee = record.get('assignee')?.properties;
    const targetType = report.targetType as AdminReport['targetType'];
    return {
      reportId: this.string(report.reportId),
      targetType,
      targetId: this.string(report.targetId),
      targetPreview:
        targetType === 'PERSON'
          ? this.firstString(target.fullName, target.username)
          : this.firstString(target.content).slice(0, 160),
      targetContent:
        targetType === 'PERSON'
          ? this.firstString(target.fullName, target.username)
          : this.optionalString(target.content),
      targetPostId:
        targetType === 'POST'
          ? this.string(report.targetId)
          : targetPost
            ? this.string(targetPost.postId)
            : null,
      targetMediaUrl:
        typeof mediaUrl === 'string'
          ? mediaUrl
          : typeof target.imageUrl === 'string'
            ? target.imageUrl
            : null,
      targetMediaType:
        mediaType === 'video'
          ? 'video'
          : mediaType === 'image' || typeof target.imageUrl === 'string'
            ? 'image'
            : null,
      targetAuthor:
        targetType === 'PERSON'
          ? {
              personId: this.string(target.personId),
              username: this.string(target.username),
            }
          : author
            ? {
                personId: this.string(author.personId),
                username: this.string(author.username),
              }
            : null,
      reason: this.string(report.reason),
      details: this.optionalString(report.details),
      status: report.status as ReportStatus,
      createdAt: this.temporal(report.createdAt),
      assignedAt: report.assignedAt ? this.temporal(report.assignedAt) : null,
      reviewedAt: report.reviewedAt ? this.temporal(report.reviewedAt) : null,
      resolvedAt: report.resolvedAt ? this.temporal(report.resolvedAt) : null,
      resolutionNote: this.optionalString(report.resolutionNote),
      reporter: {
        personId: this.string(reporter.personId),
        username: this.string(reporter.username),
        fullName: this.string(reporter.fullName),
      },
      assignee: assignee
        ? {
            personId: this.string(assignee.personId),
            username: this.string(assignee.username),
            fullName: this.string(assignee.fullName),
          }
        : null,
    };
  }

  private mapContent(
    record: {
      get<Key extends keyof ContentRecord>(key: Key): ContentRecord[Key];
    },
    type: 'POST' | 'COMMENT',
  ): AdminContent {
    const content = record.get('content').properties as Record<string, unknown>;
    const author = record.get('author')?.properties;
    const parentPost = record.get('parentPost')?.properties;
    return {
      contentId: this.string(
        type === 'POST' ? content.postId : content.commentId,
      ),
      type,
      content: this.optionalString(content.content),
      moderationStatus:
        content.moderationStatus === 'HIDDEN' ||
        content.moderationStatus === 'REMOVED'
          ? content.moderationStatus
          : 'VISIBLE',
      moderationReason: this.optionalString(content.moderationReason),
      createdAt: this.temporal(content.createdAt),
      parentPostId: parentPost ? this.string(parentPost.postId) : null,
      author: author
        ? {
            personId: this.string(author.personId),
            username: this.string(author.username),
            fullName: this.string(author.fullName),
          }
        : null,
    };
  }

  private mapAudit(record: {
    get<Key extends keyof AuditRecord>(key: Key): AuditRecord[Key];
  }): AdminAudit {
    const audit = record.get('audit').properties as Record<string, unknown>;
    const actor = record.get('actor').properties as Record<string, unknown>;
    return {
      auditId: this.string(audit.auditId),
      action: this.string(audit.action),
      targetType: this.string(audit.targetType),
      targetId: this.string(audit.targetId),
      note: this.optionalString(audit.note),
      beforeJson: this.optionalString(audit.beforeJson),
      afterJson: this.optionalString(audit.afterJson),
      createdAt: this.temporal(audit.createdAt),
      actor: {
        personId: this.string(actor.personId),
        username: this.string(actor.username),
        fullName: this.string(actor.fullName),
      },
    };
  }

  private mapRanking(value: unknown): Array<{
    personId: string;
    username: string;
    fullName: string;
    score: number;
  }> {
    if (!Array.isArray(value)) return [];
    return value.map((item: unknown) => {
      const ranking = item as Record<string, unknown>;
      return {
        personId: this.string(ranking.personId),
        username: this.string(ranking.username),
        fullName: this.string(ranking.fullName),
        score: this.count(ranking.score as Integer | number),
      };
    });
  }

  private fulltextSearch(value: string): string | null {
    const tokens = value.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
    return tokens.length
      ? tokens
          .slice(0, 8)
          .map((token) => `${token}*`)
          .join(' AND ')
      : null;
  }

  private count(value: Integer | number): number {
    return neo4j.isInt(value) ? value.toNumber() : value;
  }

  private temporal(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof DateTime) return value.toString();
    throw new ServiceUnavailableException(
      'Database returned invalid timestamp',
    );
  }

  private string(value: unknown): string {
    if (typeof value !== 'string') {
      throw new ServiceUnavailableException('Database returned invalid text');
    }
    return value;
  }

  private optionalString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private firstString(...values: unknown[]): string {
    return (
      values.find((value): value is string => typeof value === 'string') ?? ''
    );
  }

  private rethrowKnown(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }
    throw new ServiceUnavailableException('Database is unavailable');
  }
}
