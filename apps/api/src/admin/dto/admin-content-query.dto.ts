import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../../posts/types/post.type';

export class AdminContentQueryDto {
  @IsIn(['POST', 'COMMENT'])
  type: 'POST' | 'COMMENT' = 'POST';

  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  status?: ModerationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q = '';

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
