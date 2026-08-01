import {
  Body,
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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import type { MeProfile, PublicProfile } from './types/person-public.type';
import type { UserSearchResult } from './types/user-search-result.type';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.usersService.findMe(user.personId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateProfileDto,
  ): Promise<MeProfile> {
    return this.usersService.updateProfile(user.personId, input);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchUsersQueryDto,
  ): Promise<UserSearchResult[]> {
    return this.usersService.searchUsers(user.personId, query);
  }

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicProfile(
    @Param('username') username: string,
    @CurrentUser() viewer?: AuthUser,
  ): Promise<PublicProfile> {
    return this.usersService.findPublicProfileByUsername(
      username.trim().toLowerCase(),
      viewer?.personId,
    );
  }
}
