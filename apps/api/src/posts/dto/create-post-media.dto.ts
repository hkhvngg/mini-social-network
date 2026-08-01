import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export class CreatePostMediaDto {
  @ApiProperty({ example: 'misonet/posts/sample-id' })
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  @Matches(/^misonet\/posts\/[^\s]+$/)
  publicId!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
  })
  @Transform(trimString)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  secureUrl!: string;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  resourceType!: 'image' | 'video';

  @ApiPropertyOptional({
    enum: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'],
    nullable: true,
  })
  @IsOptional()
  @IsIn(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'])
  format?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  duration?: number | null;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bytes!: number;
}
