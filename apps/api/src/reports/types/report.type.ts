export const REPORT_TARGET_TYPES = ['PERSON', 'POST', 'COMMENT'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'HATE',
  'VIOLENCE',
  'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportResponse = {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
};
