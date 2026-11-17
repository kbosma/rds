import { ACCESS, isSatisfied } from './access';

describe('access', () => {
  it('without requirements everything is allowed', () => {
    expect(isSatisfied(undefined, [])).toBe(true);
  });

  it('anyOf needs at least one of the authorities', () => {
    expect(isSatisfied(ACCESS.accommodations, ['ACCOMMODATION_UPDATE'])).toBe(true);
    expect(isSatisfied(ACCESS.accommodations, ['ACCOMMODATION_READ'])).toBe(false);
  });

  it('allOf needs all of the authorities', () => {
    const almost = ['ORGANIZATION_CREATE', 'PERSON_CREATE', 'ACCOUNT_CREATE'];
    expect(isSatisfied(ACCESS.organizationOnboarding, almost)).toBe(false);
    expect(isSatisfied(ACCESS.organizationOnboarding, [...almost, 'ACCOUNTROLE_CREATE'])).toBe(true);
  });

  it('every definition names at least one authority', () => {
    for (const [name, access] of Object.entries(ACCESS)) {
      const count = (access.anyOf?.length ?? 0) + (access.allOf?.length ?? 0);
      expect(count).withContext(name).toBeGreaterThan(0);
    }
  });
});
