/** Een regel uit het rechtenlogboek. */
export interface AuthorizationLogEntry {
  authorizationLogId: string;
  tenantOrganization: string;
  action: 'ROLE_CREATED' | 'ROLE_RENAMED' | 'ROLE_DELETED' | 'AUTHORITY_ADDED' | 'AUTHORITY_REMOVED' | 'ROLE_ASSIGNED' | 'ROLE_REVOKED';
  roleId?: string;
  roleName?: string;
  authority?: string;
  accountId?: string;
  accountUserName?: string;
  details?: string;
  createdAt: string;
  createdBy?: string;
  /** Naam van wie de wijziging deed, vastgelegd op het moment zelf; leeg als RDS het zelf deed. */
  createdByName?: string | null;
}
