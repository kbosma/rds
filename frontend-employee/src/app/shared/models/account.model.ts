export interface Account {
  accountId: string;
  userName: string;
  person: string;
  locked: boolean;
  mustChangePassword: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
