export type MediaResourceType = 'image' | 'video';

export type UploadedMedia = {
  publicId: string;
  secureUrl: string;
  resourceType: MediaResourceType;
  format: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  bytes: number;
};
