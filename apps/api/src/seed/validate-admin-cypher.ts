import { NestFactory } from '@nestjs/core';
import neo4j from 'neo4j-driver';
import {
  ADMIN_AUDIT_LIST_QUERY,
  ADMIN_GRAPH_OVERVIEW_QUERY,
  ADMIN_OVERVIEW_QUERY,
  ASSIGN_REPORT_QUERY,
  RESOLVE_REPORT_QUERY,
  UPDATE_ACCOUNT_STATUS_QUERY,
  UPDATE_USER_ROLE_QUERY,
  adminContentQueries,
  adminReportQueries,
  adminUserQueries,
  moderateContentQuery,
} from '../admin/cypher/admin.queries';
import { AppModule } from '../app.module';
import { Neo4jService } from '../neo4j/neo4j.service';

const pagination = { skip: neo4j.int(0), limit: neo4j.int(5) };

const cases: Array<{
  name: string;
  query: string;
  parameters: Record<string, unknown>;
}> = [
  { name: 'overview', query: ADMIN_OVERVIEW_QUERY, parameters: {} },
  {
    name: 'user search',
    query: adminUserQueries(true, false, false).list,
    parameters: { ...pagination, search: 'demo*', status: null, role: null },
  },
  {
    name: 'post search',
    query: adminContentQueries('POST', true, false).list,
    parameters: { ...pagination, search: 'misonet*', status: null },
  },
  {
    name: 'comment list',
    query: adminContentQueries('COMMENT', false, true).list,
    parameters: { ...pagination, search: null, status: 'VISIBLE' },
  },
  {
    name: 'reports',
    query: adminReportQueries(false).list,
    parameters: { ...pagination, status: null },
  },
  {
    name: 'graph overview',
    query: ADMIN_GRAPH_OVERVIEW_QUERY,
    parameters: { limit: neo4j.int(5) },
  },
  {
    name: 'audit list',
    query: ADMIN_AUDIT_LIST_QUERY,
    parameters: { ...pagination, action: null, targetType: null },
  },
  {
    name: 'account transition',
    query: UPDATE_ACCOUNT_STATUS_QUERY,
    parameters: {
      adminPersonId: 'explain-admin',
      targetPersonId: 'explain-user',
      status: 'SUSPENDED',
      suspendedUntil: null,
      note: 'explain',
      auditId: 'explain-audit',
      action: 'SUSPEND_USER',
      beforeJson: '{}',
      afterJson: '{}',
    },
  },
  {
    name: 'role transition',
    query: UPDATE_USER_ROLE_QUERY,
    parameters: {
      adminPersonId: 'explain-admin',
      targetPersonId: 'explain-user',
      role: 'ADMIN',
      note: 'explain',
      auditId: 'explain-audit',
      beforeJson: '{}',
      afterJson: '{}',
    },
  },
  {
    name: 'post moderation',
    query: moderateContentQuery('POST'),
    parameters: {
      adminPersonId: 'explain-admin',
      contentId: 'explain-post',
      status: 'HIDDEN',
      reason: 'explain',
      targetType: 'POST',
      action: 'HIDE_CONTENT_POST',
      auditId: 'explain-audit',
      afterJson: '{}',
    },
  },
  {
    name: 'report assignment',
    query: ASSIGN_REPORT_QUERY,
    parameters: {
      adminPersonId: 'explain-admin',
      reportId: 'explain-report',
      auditId: 'explain-audit',
      beforeJson: '{}',
      afterJson: '{}',
    },
  },
  {
    name: 'report resolution',
    query: RESOLVE_REPORT_QUERY,
    parameters: {
      adminPersonId: 'explain-admin',
      reportId: 'explain-report',
      status: 'RESOLVED',
      note: 'explain',
      action: 'RESOLVE_REPORT',
      auditId: 'explain-audit',
      beforeJson: '{}',
      afterJson: '{}',
    },
  },
];

async function validateAdminCypher(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = app.get(Neo4jService);
    for (const item of cases) {
      await database.executeRead(`EXPLAIN ${item.query}`, item.parameters);
      console.log(`EXPLAIN OK: ${item.name}`);
    }
  } finally {
    await app.close();
  }
}

void validateAdminCypher().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
