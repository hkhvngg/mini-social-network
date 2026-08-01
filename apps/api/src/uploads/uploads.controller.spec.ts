import { BadRequestException } from '@nestjs/common';
import {
  profileAvatarFileFilter,
  UploadsController,
  postMediaFileFilter,
} from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
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
});
