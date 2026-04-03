export interface MolliePayment {
  molliePaymentId: string;
  molliePaymentExternalId: string;
  status: string;
  method: string | null;
  amount: number;
  currency: string;
  description: string;
  checkoutUrl: string | null;
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
  modifiedAt: string | null;
  modifiedBy: string | null;
}

export interface PaymentCreateResponse {
  id: string;
  status: string;
  _links?: {
    checkout?: { href: string };
  };
}
