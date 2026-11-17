/** Een authority; ze liggen vast (Flyway) en zijn alleen te lezen. */
export interface Authority {
  authorityId: string;
  description: string;
  domain?: string;
  tenantAssignable?: boolean;
  introducedAt?: string;
  /** Namen van de authorities die dit recht nodig heeft. */
  requires?: string[];
}
