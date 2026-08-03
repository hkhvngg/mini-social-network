import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [UploadsModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService, CommentsService],
  exports: [PostsService, CommentsService],
})
export class PostsModule {}
