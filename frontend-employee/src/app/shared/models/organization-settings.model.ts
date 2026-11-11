/** De instellingen van de eigen organisatie (één set per organisatie). Een lege keuze is toegestaan. */
export interface OrganizationSettings {
  organizationId: string;
  quoteDocumentTemplateId: string | null;
  quoteEmailTemplateId: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
}
