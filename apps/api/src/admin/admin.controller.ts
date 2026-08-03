import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AdminService } from './admin.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminContentQueryDto } from './dto/admin-content-query.dto';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { ModerateContentDto } from './dto/moderate-content.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { TopQueryDto } from './dto/top-query.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('users')
  users(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:personId/status')
  updateStatus(
    @CurrentUser() admin: AuthUser,
    @Param('personId') personId: string,
    @Body() input: UpdateAccountStatusDto,
  ) {
    return this.adminService.updateAccountStatus(
      admin.personId,
      personId,
      input,
    );
  }

  @Patch('users/:personId/role')
  updateRole(
    @CurrentUser() admin: AuthUser,
    @Param('personId') personId: string,
    @Body() input: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(admin.personId, personId, input);
  }

  @Get('content')
  content(@Query() query: AdminContentQueryDto) {
    return this.adminService.listContent(query);
  }

  @Patch('content/posts/:postId')
  moderatePost(
    @CurrentUser() admin: AuthUser,
    @Param('postId') postId: string,
    @Body() input: ModerateContentDto,
  ) {
    return this.adminService.moderateContent(
      admin.personId,
      'POST',
      postId,
      input,
    );
  }

  @Patch('content/comments/:commentId')
  moderateComment(
    @CurrentUser() admin: AuthUser,
    @Param('commentId') commentId: string,
    @Body() input: ModerateContentDto,
  ) {
    return this.adminService.moderateContent(
      admin.personId,
      'COMMENT',
      commentId,
      input,
    );
  }

  @Get('reports')
  reports(@Query() query: AdminReportsQueryDto) {
    return this.adminService.listReports(query);
  }

  @Get('reports/:reportId')
  report(@Param('reportId') reportId: string) {
    return this.adminService.getReport(reportId);
  }

  @Post('reports/:reportId/assign')
  assignReport(
    @CurrentUser() admin: AuthUser,
    @Param('reportId') reportId: string,
  ) {
    return this.adminService.assignReport(admin.personId, reportId);
  }

  @Patch('reports/:reportId')
  resolveReport(
    @CurrentUser() admin: AuthUser,
    @Param('reportId') reportId: string,
    @Body() input: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(admin.personId, reportId, input);
  }

  @Delete('posts/:postId')
  deletePost(@CurrentUser() admin: AuthUser, @Param('postId') postId: string) {
    return this.adminService.moderateContent(admin.personId, 'POST', postId, {
      status: 'REMOVED',
      reason: 'Removed through legacy admin endpoint',
    });
  }

  @Delete('comments/:commentId')
  deleteComment(
    @CurrentUser() admin: AuthUser,
    @Param('commentId') commentId: string,
  ) {
    return this.adminService.moderateContent(
      admin.personId,
      'COMMENT',
      commentId,
      {
        status: 'REMOVED',
        reason: 'Removed through legacy admin endpoint',
      },
    );
  }

  @Get('graph-overview')
  graphOverview(@Query() query: TopQueryDto) {
    return this.adminService.graphOverview(query);
  }

  @Get('audit-logs')
  auditLogs(@Query() query: AdminAuditQueryDto) {
    return this.adminService.listAudit(query);
  }
}
