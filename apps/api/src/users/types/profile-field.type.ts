export const PROFILE_FIELD_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type ProfileFieldVisibility =
  (typeof PROFILE_FIELD_VISIBILITIES)[number];

export type ProfileField = {
  fieldId: string;
  key: string;
  label: string;
  value: string;
  visibility: ProfileFieldVisibility;
  createdAt: string;
  updatedAt: string;
};
