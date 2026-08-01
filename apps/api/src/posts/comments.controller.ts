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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CommentsService } from './comments.service';
import { CommentIdParamDto } from './dto/comment-id-param.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { PostPaginationQueryDto } from './dto/post-pagination-query.dto';
import type { CommentResponse } from './types/post.type';

@Controller('posts/:postId/comments')
@UseGuards(JwtAuthGuard)
@ApiTags('Post comments')
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
    @Body() input: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.create(user.personId, params.postId, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param() params: PostIdParamDto,
    @Query() pagination: PostPaginationQueryDto,
  ): Promise<CommentResponse[]> {
    return this.commentsService.list(user.personId, params.postId, pagination);
  }

  @Patch(':commentId')
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: CommentIdParamDto,
    @Body() input: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.commentsService.update(
      user.personId,
      params.postId,
      params.commentId,
      input,
    );
  }

  @Delete(':commentId')
  delete(
    @CurrentUser() user: AuthUser,
    @Param() params: CommentIdParamDto,
  ): Promise<{ deleted: true; commentId: string }> {
    return this.commentsService.delete(
      user.personId,
      params.postId,
      params.commentId,
    );
  }
}
