import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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
}
