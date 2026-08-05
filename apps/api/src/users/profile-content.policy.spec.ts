import {
  containsBlockedProfileContent,
  isReservedProfileKey,
  profileFieldKey,
} from './profile-content.policy';

describe('profile content policy', () => {
  it('creates stable keys from Vietnamese labels', () => {
    expect(profileFieldKey('Học vấn', 0)).toBe('hoc_van');
  });

  it('detects normalized blocked content', () => {
    expect(containsBlockedProfileContent('Địt mẹ')).toBe(true);
    expect(containsBlockedProfileContent('Kỹ sư phần mềm')).toBe(false);
  });

  it('protects system-owned profile keys', () => {
    expect(isReservedProfileKey('role')).toBe(true);
    expect(isReservedProfileKey('hoc_van')).toBe(false);
  });
});
