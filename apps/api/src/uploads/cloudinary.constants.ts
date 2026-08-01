export const CLOUDINARY = Symbol('CLOUDINARY');

export const POST_MEDIA_FOLDER = 'misonet/posts';
export const PROFILE_AVATAR_FOLDER = 'misonet/avatars';

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const SUPPORTED_POST_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
