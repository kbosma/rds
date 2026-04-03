export interface Account {
  accountId: string;
  userName: string;
  personId: string;
  locked: boolean;
  mustChangePassword: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
