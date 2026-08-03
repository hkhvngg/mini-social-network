import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreatePostDto } from './dto/create-post.dto';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { PostPaginationQueryDto } from './dto/post-pagination-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import type { PostResponse } from './types/post.type';

@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiTags('Posts')
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePostDto,
  ): Promise<PostResponse> {
    return this.postsService.create(user.personId, input);
  }

  @Get('feed')
  getFeed(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PostPaginationQueryDto,
  ): Promise<PostResponse[]> {
    return this.postsService.getFeed(user.personId, pagination);
  }

  @Get('user/:username')
  getByUsername(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() pagination: PostPaginationQueryDto,
  ): Promise<PostResponse[]> {
    return this.postsService.getByUsername(
      user.personId,
      username.trim().toLowerCase(),
      pagination,
    );
  }

  @Get(':postId')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<PostResponse> {
    return this.postsService.getOne(user.personId, params.postId);
  }

  @Patch(':postId')
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
    @Body() input: UpdatePostDto,
  ): Promise<PostResponse> {
    return this.postsService.update(user.personId, params.postId, input);
  }

  @Delete(':postId')
  delete(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<{ deleted: true; postId: string }> {
    return this.postsService.delete(user.personId, params.postId);
  }

  @Post(':postId/like')
  @HttpCode(200)
  like(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<PostResponse> {
    return this.postsService.like(user.personId, params.postId);
  }

  @Delete(':postId/like')
  unlike(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<PostResponse> {
    return this.postsService.unlike(user.personId, params.postId);
  }

  @Post(':postId/repost')
  @HttpCode(200)
  repost(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<PostResponse> {
    return this.postsService.repost(user.personId, params.postId);
  }

  @Delete(':postId/repost')
  unrepost(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
  ): Promise<PostResponse> {
    return this.postsService.unrepost(user.personId, params.postId);
  }
}
