export interface Organization {
  organizationId: string;
  name: string;
  emailFrom?: string;
  /** RDS Platform: de organisatie van de beheerders (geen klant, niet te verwijderen). */
  platform?: boolean;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
