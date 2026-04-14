export interface Account {
  accountId: string;
  userName: string;
  personId: string;
  locked: boolean;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
