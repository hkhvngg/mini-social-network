import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  REPORT_STATUSES,
  type ReportStatus,
} from '../../reports/types/report.type';

export class AdminReportsQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
