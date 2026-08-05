import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsBoolean,
  IsIn,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { PROFILE_FIELD_VISIBILITIES } from '../types/profile-field.type';
import type { ProfileFieldVisibility } from '../types/profile-field.type';

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

export class ProfileFieldInputDto {
  @ApiProperty({ example: 'Học vấn', minLength: 2, maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @Length(2, 50)
  label!: string;

  @ApiProperty({ example: 'Đại học Bách Khoa', minLength: 1, maxLength: 300 })
  @Transform(trimString)
  @IsString()
  @Length(1, 300)
  value!: string;

  @ApiProperty({ enum: PROFILE_FIELD_VISIBILITIES, default: 'PUBLIC' })
  @IsIn(PROFILE_FIELD_VISIBILITIES)
  visibility: ProfileFieldVisibility = 'PUBLIC';
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

  @ApiPropertyOptional({
    type: [ProfileFieldInputDto],
    maxItems: 10,
    description: 'Các thuộc tính giới thiệu linh động của người dùng.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ProfileFieldInputDto)
  profileFields?: ProfileFieldInputDto[];
}
