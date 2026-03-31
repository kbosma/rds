export interface MolliePayment {
  molliePaymentId: string;
  molliePaymentExternalId: string;
  status: string;
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
