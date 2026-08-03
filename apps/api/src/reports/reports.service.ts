import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DateTime, Node } from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { CreateReportDto } from './dto/create-report.dto';
import type { ReportResponse, ReportTargetType } from './types/report.type';

type ReportRecord = { report: Node };

@Injectable()
export class ReportsService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(
    reporterPersonId: string,
    input: CreateReportDto,
  ): Promise<ReportResponse> {
    const targetMatch = this.targetMatch(input.targetType);

    try {
      const target = await this.neo4jService.executeRead(
        `MATCH (reporter:Person {personId: $reporterPersonId})
         ${targetMatch}
         RETURN target
         LIMIT 1`,
        { reporterPersonId, targetId: input.targetId },
      );
      if (!target.records[0])
        throw new NotFoundException('Report target not found');

      const existing = await this.neo4jService.executeRead(
        `MATCH (:Person {personId: $reporterPersonId})-[:SUBMITTED]->
               (report:Report {targetType: $targetType, targetId: $targetId})
         WHERE report.status IN ['PENDING', 'IN_REVIEW']
         RETURN report LIMIT 1`,
        {
          reporterPersonId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      );
      if (existing.records[0]) {
        throw new ConflictException('A pending report already exists');
      }

      const result = await this.neo4jService.executeWrite<ReportRecord>(
        `MATCH (reporter:Person {personId: $reporterPersonId})
         ${targetMatch}
         CREATE (report:Report {
           reportId: $reportId,
           targetType: $targetType,
           targetId: $targetId,
           reason: $reason,
           details: $details,
           status: 'PENDING',
           assignedToPersonId: null,
           assignedAt: null,
           reviewedAt: null,
           createdAt: datetime(),
           resolvedAt: null
         })
         CREATE (reporter)-[:SUBMITTED]->(report)
         CREATE (report)-[:TARGETS]->(target)
         RETURN report`,
        {
          reporterPersonId,
          reportId: randomUUID(),
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          details: input.details?.trim() ?? '',
        },
      );
      const record = result.records[0];
      if (!record) throw new NotFoundException('Report target not found');
      return this.mapReport(record.get('report'));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  private targetMatch(type: ReportTargetType): string {
    if (type === 'PERSON') {
      return `MATCH (target:Person {personId: $targetId})
              WHERE target <> reporter`;
    }
    if (type === 'POST') {
      return `MATCH (author:Person)-[:POSTED]->(target:Post {postId: $targetId})
              WHERE coalesce(target.moderationStatus, 'VISIBLE') = 'VISIBLE'
                AND (author = reporter OR target.privacy = 'PUBLIC'
                  OR (target.privacy = 'FRIENDS' AND
                      EXISTS { MATCH (reporter)-[:FRIEND]-(author) }))`;
    }
    return `MATCH (:Person)-[:COMMENTED]->(target:Comment {commentId: $targetId})
            MATCH (target)-[:ON_POST]->(post:Post)<-[:POSTED]-(postAuthor:Person)
            WHERE coalesce(target.moderationStatus, 'VISIBLE') = 'VISIBLE'
              AND coalesce(post.moderationStatus, 'VISIBLE') = 'VISIBLE'
              AND (postAuthor = reporter OR post.privacy = 'PUBLIC'
                OR (post.privacy = 'FRIENDS' AND
                    EXISTS { MATCH (reporter)-[:FRIEND]-(postAuthor) }))`;
  }

  private mapReport(node: Node): ReportResponse {
    const value = node.properties as Record<string, unknown>;
    const createdAt = value.createdAt;
    if (!(createdAt instanceof DateTime) && typeof createdAt !== 'string') {
      throw new ServiceUnavailableException('Database returned invalid report');
    }
    return {
      reportId: String(value.reportId),
      targetType: value.targetType as ReportResponse['targetType'],
      targetId: String(value.targetId),
      reason: value.reason as ReportResponse['reason'],
      details: typeof value.details === 'string' ? value.details : '',
      status: value.status as ReportResponse['status'],
      createdAt:
        typeof createdAt === 'string' ? createdAt : createdAt.toString(),
    };
  }
}
