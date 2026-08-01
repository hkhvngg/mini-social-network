import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import {
  CLOUDINARY,
  IMAGE_MAX_BYTES,
  POST_MEDIA_FOLDER,
  PROFILE_AVATAR_FOLDER,
  SUPPORTED_IMAGE_MIME_TYPES,
  SUPPORTED_POST_MEDIA_MIME_TYPES,
  VIDEO_MAX_BYTES,
} from './cloudinary.constants';
import type { CloudinaryClient } from './cloudinary.provider';
import type {
  MediaResourceType,
  UploadedMedia,
} from './types/uploaded-media.type';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: CloudinaryClient,
  ) {}

  async uploadPostMedia(file: Express.Multer.File): Promise<UploadedMedia> {
    this.validatePostMedia(file);

    return this.upload(file, POST_MEDIA_FOLDER, 'auto');
  }

  async uploadProfileAvatar(file: Express.Multer.File): Promise<UploadedMedia> {
    this.validateProfileAvatar(file);

    return this.upload(file, PROFILE_AVATAR_FOLDER, 'image');
  }

  private upload(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'auto' | 'image',
  ): Promise<UploadedMedia> {
    return new Promise<UploadedMedia>((resolve, reject) => {
      const upload = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(new BadGatewayException('Media upload failed'));
            return;
          }

          try {
            resolve(this.mapUploadResult(result));
          } catch {
            reject(new BadGatewayException('Cloudinary returned invalid data'));
          }
        },
      );

      upload.end(file.buffer);
    });
  }

  async deleteAsset(
    publicId: string,
    resourceType: MediaResourceType,
  ): Promise<void> {
    try {
      const response: unknown = await this.cloudinary.uploader.destroy(
        publicId,
        {
          invalidate: true,
          resource_type: resourceType,
        },
      );
      const result =
        response && typeof response === 'object' && 'result' in response
          ? response.result
          : null;

      if (result !== 'ok' && result !== 'not found') {
        throw new Error('Unexpected Cloudinary delete result');
      }
    } catch {
      throw new BadGatewayException('Media deletion failed');
    }
  }

  private validatePostMedia(file: Express.Multer.File): void {
    this.requireFile(file);

    if (
      !SUPPORTED_POST_MEDIA_MIME_TYPES.includes(
        file.mimetype as (typeof SUPPORTED_POST_MEDIA_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Unsupported media type');
    }

    const maxBytes = file.mimetype.startsWith('image/')
      ? IMAGE_MAX_BYTES
      : VIDEO_MAX_BYTES;

    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        file.mimetype.startsWith('image/')
          ? 'Image must not exceed 10 MB'
          : 'Video must not exceed 50 MB',
      );
    }
  }

  private validateProfileAvatar(file: Express.Multer.File): void {
    this.requireFile(file);

    if (
      !SUPPORTED_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Avatar must be JPG, PNG or WebP');
    }

    if (file.size > IMAGE_MAX_BYTES) {
      throw new PayloadTooLargeException('Avatar must not exceed 10 MB');
    }
  }

  private requireFile(file: Express.Multer.File): void {
    if (!file?.buffer) throw new BadRequestException('File is required');
  }

  private mapUploadResult(result: UploadApiResponse): UploadedMedia {
    if (
      typeof result.public_id !== 'string' ||
      typeof result.secure_url !== 'string' ||
      (result.resource_type !== 'image' && result.resource_type !== 'video') ||
      !Number.isSafeInteger(result.bytes)
    ) {
      throw new Error('Invalid upload response');
    }

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      format: typeof result.format === 'string' ? result.format : null,
      width: this.optionalNumber(result.width),
      height: this.optionalNumber(result.height),
      duration: this.optionalNumber(result.duration),
      bytes: result.bytes,
    };
  }

  private optionalNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
