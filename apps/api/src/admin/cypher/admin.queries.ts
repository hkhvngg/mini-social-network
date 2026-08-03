export const ADMIN_OVERVIEW_QUERY = `
  CALL {
    MATCH (person:Person)
    RETURN count(person) AS users,
           count(CASE WHEN coalesce(person.accountStatus, 'ACTIVE') = 'ACTIVE' THEN 1 END) AS activeUsers,
           count(CASE WHEN person.accountStatus = 'SUSPENDED' THEN 1 END) AS suspendedUsers,
           count(CASE WHEN person.accountStatus = 'BANNED' THEN 1 END) AS bannedUsers
  }
  CALL {
    MATCH (post:Post)
    RETURN count(post) AS posts,
           count(CASE WHEN EXISTS { MATCH (post)-[:REPOST_OF]->(:Post) } THEN 1 END) AS reposts
  }
  CALL { MATCH (comment:Comment) RETURN count(comment) AS comments }
  CALL {
    MATCH (report:Report)
    RETURN count(report) AS reports,
           count(CASE WHEN report.status IN ['PENDING', 'IN_REVIEW'] THEN 1 END) AS openReports
  }
  CALL { MATCH ()-[follow:FOLLOW]->() RETURN count(follow) AS follows }
  CALL { MATCH ()-[friend:FRIEND]->() RETURN count(friend) AS friends }
  CALL { MATCH ()-[like:LIKES]->() RETURN count(like) AS likes }
  RETURN users, activeUsers, suspendedUsers, bannedUsers, posts, reposts,
         comments, reports, openReports, follows, friends, likes
`;

const USER_FILTER = `
  ($status IS NULL OR coalesce(person.accountStatus, 'ACTIVE') = $status)
  AND ($role IS NULL OR coalesce(person.role, 'USER') = $role)
`;

export const ADMIN_USERS_LIST_QUERY = `
  MATCH (person:Person)
  WHERE ${USER_FILTER}
  RETURN person
  ORDER BY person.createdAt DESC, person.personId ASC
  SKIP $skip LIMIT $limit
`;

export const ADMIN_USERS_COUNT_QUERY = `
  MATCH (person:Person)
  WHERE ${USER_FILTER}
  RETURN count(person) AS total
`;

export const ADMIN_USERS_SEARCH_QUERY = `
  CALL db.index.fulltext.queryNodes('person_admin_search', $search)
  YIELD node AS person, score
  WHERE ${USER_FILTER}
  RETURN person
  ORDER BY score DESC, person.createdAt DESC, person.personId ASC
  SKIP $skip LIMIT $limit
`;

export const ADMIN_USERS_SEARCH_COUNT_QUERY = `
  CALL db.index.fulltext.queryNodes('person_admin_search', $search)
  YIELD node AS person
  WHERE ${USER_FILTER}
  RETURN count(person) AS total
`;

export function adminUserQueries(
  search: boolean,
  status: boolean,
  role: boolean,
): { list: string; count: string } {
  const properties = [
    status ? 'accountStatus: $status' : '',
    role ? 'role: $role' : '',
  ].filter(Boolean);
  const propertyMap = properties.length ? ` {${properties.join(', ')}}` : '';
  const source = search
    ? `CALL db.index.fulltext.queryNodes('person_admin_search', $search)
       YIELD node AS person, score`
    : `MATCH (person:Person${propertyMap})`;
  const searchFilters = search
    ? `WHERE ($status IS NULL OR person.accountStatus = $status)
         AND ($role IS NULL OR person.role = $role)`
    : '';
  const order = search
    ? 'ORDER BY score DESC, person.createdAt DESC, person.personId ASC'
    : 'ORDER BY person.createdAt DESC, person.personId ASC';
  return {
    list: `${source}
      ${searchFilters}
      RETURN person
      ${order}
      SKIP $skip LIMIT $limit`,
    count: `${source}
      ${searchFilters}
      RETURN count(person) AS total`,
  };
}

export const ADMIN_USER_BY_ID_QUERY = `
  MATCH (person:Person {personId: $personId})
  RETURN person
`;

export function adminReportQueries(filtered: boolean): {
  list: string;
  count: string;
} {
  const reportPattern = filtered
    ? '(report:Report {status: $status})'
    : '(report:Report)';
  return {
    list: `MATCH (reporter:Person)-[:SUBMITTED]->${reportPattern}-[:TARGETS]->(target)
      OPTIONAL MATCH (targetAuthor:Person)-[:POSTED|COMMENTED]->(target)
      OPTIONAL MATCH (target)-[:ON_POST]->(targetPost:Post)
      CALL {
        WITH target
        OPTIONAL MATCH (target)-[:HAS_MEDIA]->(targetMedia:Media)
        RETURN head(collect(targetMedia.secureUrl)) AS targetMediaUrl,
               head(collect(targetMedia.resourceType)) AS targetMediaType
      }
      OPTIONAL MATCH (assignee:Person {personId: report.assignedToPersonId})
      RETURN report, reporter, target, targetAuthor, targetPost,
             targetMediaUrl, targetMediaType, assignee
      ORDER BY report.createdAt DESC, report.reportId ASC
      SKIP $skip LIMIT $limit`,
    count: `MATCH (:Person)-[:SUBMITTED]->${reportPattern}
      RETURN count(report) AS total`,
  };
}

export const ADMIN_GRAPH_OVERVIEW_QUERY = `
  CALL {
    MATCH (person:Person)
    OPTIONAL MATCH (:Person)-[follow:FOLLOW]->(person)
    WITH person, count(follow) AS score
    ORDER BY score DESC, person.personId ASC LIMIT $limit
    RETURN collect(person{.personId, .username, .fullName, score: score}) AS topFollowers
  }
  CALL {
    MATCH (person:Person)
    OPTIONAL MATCH (person)-[friend:FRIEND]-(:Person)
    WITH person, count(friend) AS score
    ORDER BY score DESC, person.personId ASC LIMIT $limit
    RETURN collect(person{.personId, .username, .fullName, score: score}) AS topFriends
  }
  CALL {
    MATCH (person:Person)
    OPTIONAL MATCH (person)-[:POSTED]->(:Post)<-[like:LIKES]-(:Person)
    WITH person, count(like) AS score
    ORDER BY score DESC, person.personId ASC LIMIT $limit
    RETURN collect(person{.personId, .username, .fullName, score: score}) AS topLiked
  }
  CALL {
    MATCH (person:Person)
    CALL {
      WITH person
      OPTIONAL MATCH (directReport:Report)-[:TARGETS]->(person)
      RETURN count(DISTINCT directReport) AS directReports
    }
    CALL {
      WITH person
      OPTIONAL MATCH (person)-[:POSTED|COMMENTED]->(content)<-[:TARGETS]-(contentReport:Report)
      RETURN count(DISTINCT contentReport) AS contentReports
    }
    WITH person, directReports + contentReports AS score
    ORDER BY score DESC, person.personId ASC LIMIT $limit
    RETURN collect(person{.personId, .username, .fullName, score: score}) AS topReported
  }
  RETURN topFollowers, topFriends, topLiked, topReported
`;

export const ADMIN_AUDIT_LIST_QUERY = `
  MATCH (actor:Person)-[:PERFORMED]->(audit:AuditLog)
  WHERE ($action IS NULL OR audit.action = $action)
    AND ($targetType IS NULL OR audit.targetType = $targetType)
  RETURN audit, actor
  ORDER BY audit.createdAt DESC, audit.auditId ASC
  SKIP $skip LIMIT $limit
`;

export const ADMIN_AUDIT_COUNT_QUERY = `
  MATCH (:Person)-[:PERFORMED]->(audit:AuditLog)
  WHERE ($action IS NULL OR audit.action = $action)
    AND ($targetType IS NULL OR audit.targetType = $targetType)
  RETURN count(audit) AS total
`;

export const ADMIN_REPORT_BY_ID_QUERY = `
  MATCH (reporter:Person)-[:SUBMITTED]->
        (report:Report {reportId: $reportId})-[:TARGETS]->(target)
  OPTIONAL MATCH (targetAuthor:Person)-[:POSTED|COMMENTED]->(target)
  OPTIONAL MATCH (target)-[:ON_POST]->(targetPost:Post)
  CALL {
    WITH target
    OPTIONAL MATCH (target)-[:HAS_MEDIA]->(targetMedia:Media)
    RETURN head(collect(targetMedia.secureUrl)) AS targetMediaUrl,
           head(collect(targetMedia.resourceType)) AS targetMediaType
  }
  OPTIONAL MATCH (assignee:Person {personId: report.assignedToPersonId})
  RETURN report, reporter, target, targetAuthor, targetPost,
         targetMediaUrl, targetMediaType, assignee
`;

export const UPDATE_ACCOUNT_STATUS_QUERY = `
  MATCH (admin:Person {personId: $adminPersonId})
  MATCH (person:Person {personId: $targetPersonId})
  SET person.accountStatus = $status,
      person.suspendedUntil = CASE
        WHEN $status = 'SUSPENDED' AND $suspendedUntil IS NOT NULL
        THEN datetime($suspendedUntil) ELSE null END,
      person.moderationReason = $note,
      person.updatedAt = datetime()
  CREATE (audit:AuditLog {
    auditId: $auditId, action: $action, targetType: 'PERSON',
    targetId: $targetPersonId, note: $note, beforeJson: $beforeJson,
    afterJson: $afterJson, createdAt: datetime()
  })
  CREATE (admin)-[:PERFORMED]->(audit)
  RETURN person
`;

export const UPDATE_USER_ROLE_QUERY = `
  MATCH (admin:Person {personId: $adminPersonId})
  MATCH (person:Person {personId: $targetPersonId})
  CALL {
    MATCH (candidate:Person {role: 'ADMIN'})
    RETURN count(candidate) AS adminCount
  }
  WITH admin, person, adminCount
  WHERE NOT (person.role = 'ADMIN' AND $role = 'USER' AND adminCount <= 1)
  SET person.role = $role, person.updatedAt = datetime()
  CREATE (audit:AuditLog {
    auditId: $auditId, action: 'CHANGE_USER_ROLE', targetType: 'PERSON',
    targetId: $targetPersonId, note: $note, beforeJson: $beforeJson,
    afterJson: $afterJson, createdAt: datetime()
  })
  CREATE (admin)-[:PERFORMED]->(audit)
  RETURN person
`;

export function adminContentQueries(
  type: 'POST' | 'COMMENT',
  search: boolean,
  statusFiltered = false,
): { list: string; count: string } {
  const label = type === 'POST' ? 'Post' : 'Comment';
  const authorRelation = type === 'POST' ? 'POSTED' : 'COMMENTED';
  const index = type === 'POST' ? 'post_admin_search' : 'comment_admin_search';
  const idProperty = type === 'POST' ? 'postId' : 'commentId';
  const source = search
    ? `CALL db.index.fulltext.queryNodes('${index}', $search)
       YIELD node AS content, score`
    : `MATCH (content:${label}${statusFiltered ? ' {moderationStatus: $status}' : ''})`;
  const filters =
    search && statusFiltered ? 'WHERE content.moderationStatus = $status' : '';
  const order = search
    ? `ORDER BY score DESC, content.createdAt DESC, content.${idProperty} ASC`
    : `ORDER BY content.createdAt DESC, content.${idProperty} ASC`;
  return {
    list: `${source}
      ${filters}
      OPTIONAL MATCH (author:Person)-[:${authorRelation}]->(content)
      OPTIONAL MATCH (content)-[:ON_POST]->(parentPost:Post)
      RETURN content, author, parentPost
      ${order}
      SKIP $skip LIMIT $limit`,
    count: `${source}
      ${filters}
      RETURN count(content) AS total`,
  };
}

export function moderateContentQuery(type: 'POST' | 'COMMENT'): string {
  const label = type === 'POST' ? 'Post' : 'Comment';
  const idProperty = type === 'POST' ? 'postId' : 'commentId';
  return `
    MATCH (admin:Person {personId: $adminPersonId})
    MATCH (content:${label} {${idProperty}: $contentId})
    WITH admin, content,
         coalesce(content.moderationStatus, 'VISIBLE') AS previousStatus
    SET content.moderationStatus = $status,
        content.moderationReason = $reason,
        content.moderatedAt = datetime(),
        content.moderatedByPersonId = $adminPersonId
    CREATE (audit:AuditLog {
      auditId: $auditId,
      action: $action,
      targetType: $targetType,
      targetId: $contentId,
      note: $reason,
      beforeJson: '{"moderationStatus":"' + previousStatus + '"}',
      afterJson: $afterJson,
      createdAt: datetime()
    })
    CREATE (admin)-[:PERFORMED]->(audit)
    WITH admin, content, previousStatus, audit
    OPTIONAL MATCH (report:Report {targetType: $targetType, targetId: $contentId})
    WHERE $status = 'REMOVED' AND report.status IN ['PENDING', 'IN_REVIEW']
    SET report.status = 'RESOLVED',
        report.resolutionNote = CASE WHEN $reason = '' THEN 'Content removed' ELSE $reason END,
        report.resolvedAt = datetime(),
        report.handledByPersonId = $adminPersonId
    RETURN content, previousStatus
  `;
}

export const ASSIGN_REPORT_QUERY = `
  MATCH (admin:Person {personId: $adminPersonId})
  MATCH (report:Report {reportId: $reportId})
  WHERE report.status IN ['PENDING', 'IN_REVIEW']
    AND (report.assignedToPersonId IS NULL OR report.assignedToPersonId = $adminPersonId)
  WITH admin, report, report.status AS previousStatus
  SET report.status = 'IN_REVIEW',
      report.assignedToPersonId = $adminPersonId,
      report.assignedAt = coalesce(report.assignedAt, datetime()),
      report.reviewedAt = datetime()
  MERGE (admin)-[:ASSIGNED]->(report)
  CREATE (audit:AuditLog {
    auditId: $auditId, action: 'ASSIGN_REPORT', targetType: 'REPORT',
    targetId: $reportId, note: '', beforeJson: $beforeJson,
    afterJson: $afterJson, createdAt: datetime()
  })
  CREATE (admin)-[:PERFORMED]->(audit)
  RETURN report, previousStatus
`;

export const RESOLVE_REPORT_QUERY = `
  MATCH (admin:Person {personId: $adminPersonId})
  MATCH (reporter:Person)-[:SUBMITTED]->
        (report:Report {reportId: $reportId})-[:TARGETS]->(target)
  WHERE report.status IN ['PENDING', 'IN_REVIEW']
    AND (report.assignedToPersonId IS NULL OR report.assignedToPersonId = $adminPersonId)
  OPTIONAL MATCH (targetAuthor:Person)-[:POSTED|COMMENTED]->(target)
  OPTIONAL MATCH (target)-[:ON_POST]->(targetPost:Post)
  CALL {
    WITH target
    OPTIONAL MATCH (target)-[:HAS_MEDIA]->(targetMedia:Media)
    RETURN head(collect(targetMedia.secureUrl)) AS targetMediaUrl,
           head(collect(targetMedia.resourceType)) AS targetMediaType
  }
  WITH admin, reporter, report, target, targetAuthor, targetPost,
       targetMediaUrl, targetMediaType, report.status AS previousStatus
  SET report.status = $status,
      report.assignedToPersonId = coalesce(report.assignedToPersonId, $adminPersonId),
      report.assignedAt = coalesce(report.assignedAt, datetime()),
      report.reviewedAt = datetime(),
      report.resolutionNote = $note,
      report.resolvedAt = datetime(),
      report.handledByPersonId = $adminPersonId
  MERGE (admin)-[:HANDLED]->(report)
  CREATE (audit:AuditLog {
    auditId: $auditId, action: $action, targetType: 'REPORT',
    targetId: $reportId, note: $note, beforeJson: $beforeJson,
    afterJson: $afterJson, createdAt: datetime()
  })
  CREATE (admin)-[:PERFORMED]->(audit)
  OPTIONAL MATCH (assignee:Person {personId: report.assignedToPersonId})
  RETURN report, reporter, target, targetAuthor, targetPost,
         targetMediaUrl, targetMediaType, assignee, previousStatus
`;
