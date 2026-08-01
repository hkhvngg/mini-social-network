import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { POST_PRIVACIES } from '../types/post.type';
import type { PostPrivacy } from '../types/post.type';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export class UpdatePostDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 5000 })
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(1, 5000)
  content?: string;

  @ApiPropertyOptional({ enum: POST_PRIVACIES })
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(POST_PRIVACIES)
  privacy?: PostPrivacy;
}
