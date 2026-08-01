import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import {
  IMAGE_MAX_BYTES,
  POST_MEDIA_FOLDER,
  PROFILE_AVATAR_FOLDER,
  VIDEO_MAX_BYTES,
} from './cloudinary.constants';
import type { CloudinaryClient } from './cloudinary.provider';
import { UploadsService } from './uploads.service';

function file(
  mimetype: string,
  size: number,
  buffer = Buffer.from('media'),
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'media',
    encoding: '7bit',
    mimetype,
    size,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as never,
  };
}

describe('UploadsService', () => {
  it('uploads supported media using upload_stream and maps safe metadata', async () => {
    const end = jest.fn();
    const uploadStream = jest.fn(
      (
        _options: unknown,
        callback: (error: undefined, result: UploadApiResponse) => void,
      ) => {
        end.mockImplementationOnce(() =>
          callback(undefined, {
            public_id: 'misonet/posts/asset-1',
            secure_url:
              'https://res.cloudinary.com/demo/image/upload/asset-1.webp',
            resource_type: 'image',
            format: 'webp',
            width: 1200,
            height: 800,
            bytes: 4567,
          } as UploadApiResponse),
        );
        return { end };
      },
    );
    const cloudinary = {
      uploader: { upload_stream: uploadStream },
    } as unknown as CloudinaryClient;
    const service = new UploadsService(cloudinary);
    const buffer = Buffer.from('image');

    await expect(
      service.uploadPostMedia(file('image/webp', buffer.length, buffer)),
    ).resolves.toEqual({
      publicId: 'misonet/posts/asset-1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/asset-1.webp',
      resourceType: 'image',
      format: 'webp',
      width: 1200,
      height: 800,
      duration: null,
      bytes: 4567,
    });
    expect(uploadStream).toHaveBeenCalledWith(
      { folder: POST_MEDIA_FOLDER, resource_type: 'auto' },
      expect.any(Function),
    );
    expect(end).toHaveBeenCalledWith(buffer);
  });

  it('rejects unsupported media before contacting Cloudinary', async () => {
    const cloudinary = {
      uploader: { upload_stream: jest.fn() },
    } as unknown as CloudinaryClient;
    const service = new UploadsService(cloudinary);

    await expect(
      service.uploadPostMedia(file('application/pdf', 100)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('uploads avatars to their own Cloudinary folder as images', async () => {
    const end = jest.fn();
    const uploadStream = jest.fn(
      (
        _options: unknown,
        callback: (error: undefined, result: UploadApiResponse) => void,
      ) => {
        end.mockImplementationOnce(() =>
          callback(undefined, {
            public_id: 'misonet/avatars/avatar-1',
            secure_url:
              'https://res.cloudinary.com/demo/image/upload/avatar-1.webp',
            resource_type: 'image',
            format: 'webp',
            width: 512,
            height: 512,
            bytes: 1234,
          } as UploadApiResponse),
        );
        return { end };
      },
    );
    const cloudinary = {
      uploader: { upload_stream: uploadStream },
    } as unknown as CloudinaryClient;
    const service = new UploadsService(cloudinary);

    await expect(
      service.uploadProfileAvatar(file('image/png', 1234)),
    ).resolves.toMatchObject({
      publicId: 'misonet/avatars/avatar-1',
      resourceType: 'image',
    });
    expect(uploadStream).toHaveBeenCalledWith(
      { folder: PROFILE_AVATAR_FOLDER, resource_type: 'image' },
      expect.any(Function),
    );
  });

  it.each([
    ['image/png', IMAGE_MAX_BYTES + 1],
    ['video/mp4', VIDEO_MAX_BYTES + 1],
  ])('enforces the size limit for %s', async (mimetype, size) => {
    const cloudinary = {
      uploader: { upload_stream: jest.fn() },
    } as unknown as CloudinaryClient;
    const service = new UploadsService(cloudinary);

    await expect(
      service.uploadPostMedia(file(mimetype, size)),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('deletes the correct Cloudinary resource type by publicId', async () => {
    const destroy = jest.fn().mockResolvedValue({ result: 'ok' });
    const cloudinary = {
      uploader: { destroy },
    } as unknown as CloudinaryClient;
    const service = new UploadsService(cloudinary);

    await service.deleteAsset('misonet/posts/video-1', 'video');

    expect(destroy).toHaveBeenCalledWith('misonet/posts/video-1', {
      invalidate: true,
      resource_type: 'video',
    });
  });
});
