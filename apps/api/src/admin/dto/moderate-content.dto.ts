import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../../posts/types/post.type';

export class ModerateContentDto {
  @IsIn(MODERATION_STATUSES)
  status!: ModerationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
