import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationIdParamDto } from './dto/notification-id-param.dto';
import { NotificationPaginationQueryDto } from './dto/notification-pagination-query.dto';
import { NotificationsService } from './notifications.service';
import type { NotificationResponse } from './types/notification.type';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() pagination: NotificationPaginationQueryDto,
  ): Promise<NotificationResponse[]> {
    return this.notificationsService.list(user.personId, pagination);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(user.personId);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: AuthUser,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllRead(user.personId);
  }

  @Patch(':notificationId/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param() params: NotificationIdParamDto,
  ): Promise<NotificationResponse> {
    return this.notificationsService.markRead(
      user.personId,
      params.notificationId,
    );
  }
}
