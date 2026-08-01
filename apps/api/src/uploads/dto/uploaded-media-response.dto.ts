import { ApiProperty } from '@nestjs/swagger';

export class UploadedMediaResponseDto {
  @ApiProperty({ example: 'misonet/posts/asset-id' })
  publicId!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/asset.webp',
  })
  secureUrl!: string;

  @ApiProperty({ enum: ['image', 'video'] })
  resourceType!: 'image' | 'video';

  @ApiProperty({ example: 'webp', nullable: true })
  format!: string | null;

  @ApiProperty({ example: 1200, nullable: true })
  width!: number | null;

  @ApiProperty({ example: 800, nullable: true })
  height!: number | null;

  @ApiProperty({ example: null, nullable: true })
  duration!: number | null;

  @ApiProperty({ example: 456789 })
  bytes!: number;
}
