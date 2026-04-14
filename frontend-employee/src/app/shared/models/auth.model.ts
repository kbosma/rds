export interface LoginResponse {
  token: string | null;
  accountId: string | null;
  organizationId: string | null;
  mustChangePassword: boolean | null;
  requiresTotp: boolean | null;
  requiresTotpSetup: boolean | null;
  tempToken: string | null;
}

export interface TokenPayload {
  sub: string;
  org: string;
  personId: string;
  personName: string;
  organizationName: string;
  roles: string[];
  authorities: string[];
  exp: number;
}

export interface TotpSetupResponse {
  secret: string;
  qrCodeDataUri: string;
  manualEntryKey: string;
  recoveryCodes: string[];
}
