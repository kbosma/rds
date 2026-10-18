export interface MolliePayment {
  molliePaymentId: string;
  molliePaymentExternalId: string;
  method: string | null;
  amount: number;
  currency: string;
  description: string;
  checkoutUrl: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}

export interface MolliePaymentStatusEntry {
  molliePaymentStatusEntryId: string;
  molliePaymentId: string;
  status: string;
  createdAt: string;
  createdBy: string | null;
  /** Leesbare naam van wie de regel aanmaakte (medewerker of boeker); leeg bij het systeem (Mollie). */
  createdByName?: string | null;
  /** True bij een handmatige correctie door een medewerker (dan is `reason` gevuld). */
  correction?: boolean;
  reason?: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
}
