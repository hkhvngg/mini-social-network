import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  type ReportReason,
  type ReportTargetType,
} from '../types/report.type';

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @IsString()
  @MaxLength(100)
  targetId!: string;

  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
