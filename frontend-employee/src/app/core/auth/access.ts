/**
 * Welke authorities een scherm nodig heeft. Dit is de enige plek: het menu (layout) en de route-guards
 * (app.routes en de routes van de features) lezen allebei hieruit, zodat ze niet uit elkaar kunnen lopen.
 *
 * - `anyOf`: minstens één van deze authorities.
 * - `allOf`: al deze authorities.
 * Beide mogen samen; een scherm zonder eisen heeft geen `Access` (bijv. het dashboard).
 *
 * Zie docs/voorstel-eigen-rollen.md, §7.
 */
export interface Access {
  anyOf?: readonly string[];
  allOf?: readonly string[];
}

const anyOf = (...authorities: string[]): Access => ({ anyOf: authorities });
const allOf = (...authorities: string[]): Access => ({ allOf: authorities });

export const ACCESS = {
  bookings: anyOf('BOOKING_READ'),
  bookingCreate: anyOf('BOOKING_CREATE'),
  bookingPayments: allOf('BOOKING_READ', 'PAYMENT_READ'),
  bookers: anyOf('BOOKING_READ'),
  prospects: anyOf('BOOKING_READ'),
  travelers: anyOf('BOOKING_READ'),
  payments: anyOf('PAYMENT_READ'),

  accommodations: anyOf('ACCOMMODATION_CREATE', 'ACCOMMODATION_UPDATE', 'ACCOMMODATION_DELETE'),
  accommodationCreate: anyOf('ACCOMMODATION_CREATE'),
  suppliers: anyOf('SUPPLIER_CREATE', 'SUPPLIER_UPDATE', 'SUPPLIER_DELETE'),
  supplierCreate: anyOf('SUPPLIER_CREATE'),
  activities: anyOf('ACTIVITY_CREATE', 'ACTIVITY_UPDATE', 'ACTIVITY_DELETE'),
  activityCreate: anyOf('ACTIVITY_CREATE'),
  templates: anyOf('TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE'),
  emailTemplates: anyOf('TEMPLATE_READ'),

  organizations: anyOf('ORGANIZATION_READ'),
  organizationCreate: anyOf('ORGANIZATION_CREATE'),
  organizationOnboarding: allOf('ORGANIZATION_CREATE', 'PERSON_CREATE', 'ACCOUNT_CREATE', 'ACCOUNTROLE_CREATE'),
  persons: anyOf('PERSON_CREATE', 'PERSON_DELETE'),
  personCreate: anyOf('PERSON_CREATE'),
  accounts: anyOf('ACCOUNT_CREATE', 'ACCOUNT_DELETE'),
  accountCreate: anyOf('ACCOUNT_CREATE'),
  roles: anyOf('ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE'),
  roleCreate: anyOf('ROLE_CREATE'),
  authorities: anyOf('AUTHORITY_CREATE', 'AUTHORITY_UPDATE', 'AUTHORITY_DELETE'),
  authorityCreate: anyOf('AUTHORITY_CREATE'),
  theme: anyOf('ORGANIZATION_THEME_UPDATE'),
  organizationSettings: anyOf('ORGANIZATION_SETTINGS_READ'),

  profile: anyOf('PERSON_UPDATE'),
  changePassword: anyOf('ACCOUNT_UPDATE'),

  /** Overzicht van alle organisaties op het dashboard (beheerder). */
  adminDashboard: allOf('ORGANIZATION_READ', 'PERSON_READ', 'ACCOUNT_READ', 'ROLE_READ', 'ACCOUNTROLE_READ'),
  /** Cijfers over boekingen en betalingen op het dashboard (manager). */
  managerDashboard: allOf('ACCOUNT_CREATE', 'BOOKING_READ', 'PAYMENT_READ'),
} as const satisfies Record<string, Access>;

/** Voldoen deze authorities aan de eisen? Zonder eisen altijd waar. */
export function isSatisfied(access: Access | undefined, authorities: readonly string[]): boolean {
  if (!access) return true;
  const any = !access.anyOf || access.anyOf.length === 0 || access.anyOf.some((a) => authorities.includes(a));
  const all = !access.allOf || access.allOf.every((a) => authorities.includes(a));
  return any && all;
}
