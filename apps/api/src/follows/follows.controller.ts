import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PersonIdParamDto } from './dto/person-id-param.dto';
import { FollowsService } from './follows.service';
import type { ConnectionListItem } from './types/connection-list-item.type';
import type { FollowRelationshipStatus } from './types/follow-relationship-status.type';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Follows')
@ApiBearerAuth()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':personId/follow')
  @HttpCode(200)
  follow(
    @CurrentUser() user: AuthUser,
    @Param() params: PersonIdParamDto,
  ): Promise<FollowRelationshipStatus> {
    return this.followsService.follow(user.personId, params.personId);
  }

  @Delete(':personId/follow')
  unfollow(
    @CurrentUser() user: AuthUser,
    @Param() params: PersonIdParamDto,
  ): Promise<FollowRelationshipStatus> {
    return this.followsService.unfollow(user.personId, params.personId);
  }

  @Get('me/followers')
  getFollowers(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getFollowers(user.personId, pagination);
  }

  @Get('me/following')
  getFollowing(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getFollowing(user.personId, pagination);
  }

  @Get('me/friends')
  getFriends(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getFriends(user.personId, pagination);
  }

  @Get(':username/followers')
  getUserFollowers(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getUserFollowers(
      user.personId,
      username.trim().toLowerCase(),
      pagination,
    );
  }

  @Get(':username/following')
  getUserFollowing(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getUserFollowing(
      user.personId,
      username.trim().toLowerCase(),
      pagination,
    );
  }

  @Get(':username/friends')
  getUserFriends(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ConnectionListItem[]> {
    return this.followsService.getUserFriends(
      user.personId,
      username.trim().toLowerCase(),
      pagination,
    );
  }

  @Get(':personId/relationship-status')
  getRelationshipStatus(
    @CurrentUser() user: AuthUser,
    @Param() params: PersonIdParamDto,
  ): Promise<FollowRelationshipStatus> {
    return this.followsService.getRelationshipStatus(
      user.personId,
      params.personId,
    );
  }
}
