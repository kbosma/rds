export interface Role {
  roleId: string;
  description: string;
  /** De organisatie waar de rol bij hoort. */
  tenantOrganization?: string;
  /** ADMIN, MANAGER of EMPLOYEE voor een vergrendelde systeemrol; leeg voor een eigen rol. */
  systemKey?: string | null;
  /** Mag de ingelogde gebruiker deze rol wijzigen (eigen rol, onder zijn niveau)? */
  editable?: boolean | null;
  /** Aantal accounts met deze rol. */
  accountCount?: number | null;
}
