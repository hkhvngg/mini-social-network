export const SCHEMA_STATEMENTS = [
  'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.personId IS UNIQUE',
  'CREATE CONSTRAINT person_username_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.username IS UNIQUE',
  'CREATE CONSTRAINT person_email_unique IF NOT EXISTS FOR (person:Person) REQUIRE person.email IS UNIQUE',
  'CREATE CONSTRAINT post_id_unique IF NOT EXISTS FOR (post:Post) REQUIRE post.postId IS UNIQUE',
  'CREATE CONSTRAINT repost_key_unique IF NOT EXISTS FOR (post:Post) REQUIRE post.repostKey IS UNIQUE',
  'CREATE CONSTRAINT comment_id_unique IF NOT EXISTS FOR (comment:Comment) REQUIRE comment.commentId IS UNIQUE',
  'CREATE CONSTRAINT notification_id_unique IF NOT EXISTS FOR (notification:Notification) REQUIRE notification.notificationId IS UNIQUE',
  'CREATE CONSTRAINT notification_key_unique IF NOT EXISTS FOR (notification:Notification) REQUIRE notification.notificationKey IS UNIQUE',
  'CREATE CONSTRAINT report_id_unique IF NOT EXISTS FOR (report:Report) REQUIRE report.reportId IS UNIQUE',
  'CREATE CONSTRAINT audit_id_unique IF NOT EXISTS FOR (audit:AuditLog) REQUIRE audit.auditId IS UNIQUE',
  'CREATE CONSTRAINT profile_field_id_unique IF NOT EXISTS FOR (field:ProfileField) REQUIRE field.fieldId IS UNIQUE',
  'CREATE INDEX person_status IF NOT EXISTS FOR (person:Person) ON (person.accountStatus)',
  'CREATE INDEX person_role IF NOT EXISTS FOR (person:Person) ON (person.role)',
  'CREATE INDEX person_status_role IF NOT EXISTS FOR (person:Person) ON (person.accountStatus, person.role)',
  'CREATE INDEX post_moderation_status IF NOT EXISTS FOR (post:Post) ON (post.moderationStatus)',
  'CREATE INDEX comment_moderation_status IF NOT EXISTS FOR (comment:Comment) ON (comment.moderationStatus)',
  'CREATE INDEX report_status_created IF NOT EXISTS FOR (report:Report) ON (report.status, report.createdAt)',
  'CREATE INDEX audit_created IF NOT EXISTS FOR (audit:AuditLog) ON (audit.createdAt)',
  'CREATE INDEX profile_field_visibility IF NOT EXISTS FOR (field:ProfileField) ON (field.visibility)',
  'CREATE FULLTEXT INDEX person_admin_search IF NOT EXISTS FOR (person:Person) ON EACH [person.username, person.fullName, person.email]',
  'CREATE FULLTEXT INDEX post_admin_search IF NOT EXISTS FOR (post:Post) ON EACH [post.content]',
  'CREATE FULLTEXT INDEX comment_admin_search IF NOT EXISTS FOR (comment:Comment) ON EACH [comment.content]',
] as const;

export const MODERATION_DATA_MIGRATION = `
  MATCH (person:Person)
  SET person.role = coalesce(person.role, 'USER'),
      person.accountStatus = coalesce(person.accountStatus, 'ACTIVE'),
      person.moderationReason = coalesce(person.moderationReason, '')
  WITH count(person) AS people
  MATCH (post:Post)
  SET post.moderationStatus = coalesce(post.moderationStatus, 'VISIBLE'),
      post.moderationReason = coalesce(post.moderationReason, '')
  WITH people, count(post) AS posts
  MATCH (comment:Comment)
  SET comment.moderationStatus = coalesce(comment.moderationStatus, 'VISIBLE'),
      comment.moderationReason = coalesce(comment.moderationReason, '')
  RETURN people, posts, count(comment) AS comments
`;
