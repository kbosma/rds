/** De instellingen van de eigen organisatie (één set per organisatie). Een lege keuze is toegestaan. */
export interface OrganizationSettings {
  organizationId: string;
  quoteDocumentTemplateId: string | null;
  quoteEmailTemplateId: string | null;
  /** Voorschot als percentage van het totaal (1-100). */
  depositPercentage: number;
  /** Het voorschot vervalt zoveel weken voor vertrek (of direct). */
  depositWeeksBeforeDeparture: number;
  /** Het restant vervalt zoveel weken voor vertrek; minder dan bij het voorschot. */
  balanceWeeksBeforeDeparture: number;
  /** De e-mail met de betalingen aan de hoofdboeker; leeg = geen mail. */
  paymentEmailTemplateId: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
}
