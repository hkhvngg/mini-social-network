import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { CreatePostMediaDto } from './create-post-media.dto';
import { POST_PRIVACIES } from '../types/post.type';
import type { PostPrivacy } from '../types/post.type';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export class CreatePostDto {
  @ApiProperty({ example: 'Hello from Neo4j!', minLength: 1, maxLength: 5000 })
  @Transform(trimString)
  @IsString()
  @Length(1, 5000)
  content!: string;

  @ApiPropertyOptional({ type: CreatePostMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto;

  @ApiPropertyOptional({ enum: POST_PRIVACIES, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(POST_PRIVACIES)
  privacy: PostPrivacy = 'PUBLIC';
}
