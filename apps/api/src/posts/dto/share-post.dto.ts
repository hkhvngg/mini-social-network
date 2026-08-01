import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SHARE_CHANNELS } from '../types/post.type';
import type { ShareChannel } from '../types/post.type';

export class SharePostDto {
  @ApiPropertyOptional({ enum: SHARE_CHANNELS, default: 'COPY' })
  @IsOptional()
  @IsEnum(SHARE_CHANNELS)
  channel: ShareChannel = 'COPY';
}
