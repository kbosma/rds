export interface LoginResponse {
  token: string;
  accountId: string;
  organizationId: string;
  mustChangePassword: boolean;
}

export interface TokenPayload {
  sub: string;
  org: string;
  roles: string[];
  authorities: string[];
  exp: number;
}
