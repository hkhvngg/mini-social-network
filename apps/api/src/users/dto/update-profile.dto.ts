import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsBoolean,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

function normalizeInterests({ value }: TransformFnParams): unknown {
  if (!Array.isArray(value)) return value as unknown;

  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string') return value as unknown;
    const trimmed = item.trim();
    if (trimmed) unique.set(trimmed.toLocaleLowerCase('vi'), trimmed);
  }
  return [...unique.values()];
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyen Van Minh',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'Backend developer', maxLength: 500 })
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/avatar.webp',
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Matches(/^https:\/\/res\.cloudinary\.com\//, {
    message: 'avatarUrl must be a secure Cloudinary URL',
  })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ default: false })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    example: 'TP. Hồ Chí Minh',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(trimString)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(2, 100)
  location?: string;

  @ApiPropertyOptional({
    example: ['Công nghệ', 'Âm nhạc'],
    minItems: 1,
    maxItems: 10,
    type: [String],
  })
  @Transform(normalizeInterests)
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  interests?: string[];
}
