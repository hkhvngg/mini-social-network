import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import type { ReportResponse } from './types/report.type';

@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiTags('Reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateReportDto,
  ): Promise<ReportResponse> {
    return this.reportsService.create(user.personId, input);
  }
}
