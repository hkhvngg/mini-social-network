import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  IMAGE_MAX_BYTES,
  SUPPORTED_POST_MEDIA_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
  VIDEO_MAX_BYTES,
} from './cloudinary.constants';
import { UploadedMediaResponseDto } from './dto/uploaded-media-response.dto';
import { UploadsService } from './uploads.service';

export function postMediaFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const supported = SUPPORTED_POST_MEDIA_MIME_TYPES.includes(
    file.mimetype as (typeof SUPPORTED_POST_MEDIA_MIME_TYPES)[number],
  );

  callback(
    supported ? null : new BadRequestException('Unsupported media type'),
    supported,
  );
}

export function profileAvatarFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const supported = SUPPORTED_IMAGE_MIME_TYPES.includes(
    file.mimetype as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number],
  );

  callback(
    supported
      ? null
      : new BadRequestException('Avatar must be JPG, PNG or WebP'),
    supported,
  );
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiTags('Uploads')
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('post-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: VIDEO_MAX_BYTES },
      fileFilter: postMediaFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'JPG, PNG, WebP (max 10 MB) or MP4, WebM, MOV (max 50 MB)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Cloudinary media metadata',
    type: UploadedMediaResponseDto,
  })
  uploadPostMedia(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadedMediaResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    return this.uploadsService.uploadPostMedia(file);
  }

  @Post('profile-avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES },
      fileFilter: profileAvatarFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JPG, PNG or WebP avatar (max 10 MB)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Cloudinary avatar metadata',
    type: UploadedMediaResponseDto,
  })
  uploadProfileAvatar(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadedMediaResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    return this.uploadsService.uploadProfileAvatar(file);
  }
}
