const BLOCKED_TOKENS = new Set([
  'bitch',
  'clm',
  'dcm',
  'dmcs',
  'fuck',
  'shit',
  'vcl',
]);

const BLOCKED_PHRASES = ['cai lon', 'con cac', 'dit me', 'du ma'] as const;

const RESERVED_PROFILE_KEYS = new Set([
  'account_status',
  'avatar_url',
  'anh_dai_dien',
  'bio',
  'created_at',
  'email',
  'full_name',
  'ho_va_ten',
  'interests',
  'is_private',
  'location',
  'mat_khau',
  'moderation_reason',
  'password',
  'password_hash',
  'person_id',
  'role',
  'so_thich',
  'suspended_until',
  'ten_dang_nhap',
  'tieu_su',
  'trang_thai_tai_khoan',
  'updated_at',
  'username',
  'vai_tro',
]);

export function normalizeProfileText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function profileFieldKey(label: string, position: number): string {
  const normalized = normalizeProfileText(label).replace(/\s+/g, '_');
  return normalized || `field_${position + 1}`;
}

export function containsBlockedProfileContent(value: string): boolean {
  const normalized = normalizeProfileText(value);
  const tokens = normalized.split(' ').filter(Boolean);
  return (
    tokens.some((token) => BLOCKED_TOKENS.has(token)) ||
    BLOCKED_PHRASES.some((phrase) => normalized.includes(phrase))
  );
}

export function isReservedProfileKey(key: string): boolean {
  return RESERVED_PROFILE_KEYS.has(key);
}
