import { BadRequestException } from '@nestjs/common';
import {
  profileAvatarFileFilter,
  UploadsController,
  postMediaFileFilter,
} from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  const image = { mimetype: 'image/png' } as Express.Multer.File;

  it('requires multipart field file', () => {
    const service = { uploadPostMedia: jest.fn() } as unknown as UploadsService;
    const controller = new UploadsController(service);

    expect(() => controller.uploadPostMedia()).toThrow(BadRequestException);
  });

  it('rejects a MIME type outside the allowlist', () => {
    const callback = jest.fn();

    postMediaFileFilter(
      {} as Express.Request,
      { mimetype: 'application/pdf' } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });

  it('allows only image MIME types for profile avatars', () => {
    const callback = jest.fn();

    profileAvatarFileFilter(
      {} as Express.Request,
      { mimetype: 'video/mp4' } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });

  it('accepts a supported post image in the file filter', () => {
    const callback = jest.fn();

    postMediaFileFilter({} as Express.Request, image, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('delegates a valid post media file to the upload service', async () => {
    const uploadPostMedia = jest
      .fn()
      .mockResolvedValue({ publicId: 'asset-1' });
    const controller = new UploadsController({
      uploadPostMedia,
    } as unknown as UploadsService);

    await expect(controller.uploadPostMedia(image)).resolves.toEqual({
      publicId: 'asset-1',
    });
    expect(uploadPostMedia).toHaveBeenCalledWith(image);
  });

  it('requires a file when uploading a profile avatar', () => {
    const controller = new UploadsController({} as UploadsService);

    expect(() => controller.uploadProfileAvatar()).toThrow(BadRequestException);
  });
});
