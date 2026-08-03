import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ReportStatus } from '../../reports/types/report.type';

export class ResolveReportDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: Extract<ReportStatus, 'RESOLVED' | 'REJECTED'>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
