import { SCHEMA_STATEMENTS } from '../../neo4j/schema.statements';
import {
  ADMIN_OVERVIEW_QUERY,
  ASSIGN_REPORT_QUERY,
  adminContentQueries,
  adminUserQueries,
  moderateContentQuery,
} from './admin.queries';

describe('admin Cypher queries', () => {
  it('isolates dashboard aggregations with subqueries', () => {
    expect(
      ADMIN_OVERVIEW_QUERY.match(/CALL\s*{/g)?.length,
    ).toBeGreaterThanOrEqual(7);
    expect(ADMIN_OVERVIEW_QUERY).toContain('count(friend) AS friends');
    expect(ADMIN_OVERVIEW_QUERY).toContain('count(like) AS likes');
  });

  it('uses full-text search and indexed property patterns', () => {
    expect(adminUserQueries(true, false, false).list).toContain(
      "db.index.fulltext.queryNodes('person_admin_search'",
    );
    expect(adminUserQueries(false, true, true).list).toContain(
      'Person {accountStatus: $status, role: $role}',
    );
    expect(adminContentQueries('POST', false, true).list).toContain(
      'Post {moderationStatus: $status}',
    );
  });

  it('moderates content without physically deleting it', () => {
    const query = moderateContentQuery('POST');
    expect(query).toContain('content.moderationStatus = $status');
    expect(query).toContain('CREATE (audit:AuditLog');
    expect(query).not.toMatch(/DETACH\s+DELETE|DELETE\s+content/);
  });

  it('guards report assignment against concurrent administrators', () => {
    expect(ASSIGN_REPORT_QUERY).toContain(
      'report.assignedToPersonId IS NULL OR report.assignedToPersonId = $adminPersonId',
    );
    expect(ASSIGN_REPORT_QUERY).toContain("report.status = 'IN_REVIEW'");
  });

  it('declares indexes used by admin filters and searches', () => {
    const schema = SCHEMA_STATEMENTS.join('\n');
    expect(schema).toContain('person_status_role');
    expect(schema).toContain('report_status_created');
    expect(schema).toContain('person_admin_search');
    expect(schema).toContain('post_admin_search');
    expect(schema).toContain('comment_admin_search');
  });
});
