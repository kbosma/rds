/** Spiegel van de minimale DTO's van het boekerportaal (`/api/booker-portal/**`). */

export interface PortalBooking {
  bookingNumber: string;
  /** lowercase: aanvraag, offerte, boeking, voorschot, betaald, opreis, weerthuis, afgerond */
  status: string;
  /** jjjj-mm-dd; leeg zolang de boeking nog geen verblijven heeft */
  fromDate: string | null;
  untilDate: string | null;
  totalSum: number;
}

export interface PortalOrganization {
  name: string;
  primaryColor: string | null;
  accentColor: string | null;
  cardTitleColor: string | null;
  logoUrl: string | null;
}

export interface PortalOverview {
  booking: PortalBooking;
  booker: { firstname: string } | null;
  travelers: { firstname: string }[];
  organization: PortalOrganization | null;
}

/** Een verblijf (boekingsregel). `fromDate`/`untilDate` zijn jjjj-mm-dd; de nacht van `untilDate` telt niet mee. */
export interface PortalStay {
  bookingLineId: string;
  accommodationName: string;
  supplierName: string;
  fromDate: string;
  untilDate: string;
}

/** Een geplande activiteit. De tijden zijn jjjj-mm-ddTuu:mm:ss; `activityType` komt in hoofdletters binnen. */
export interface PortalActivity {
  activityId: string;
  name: string;
  description: string | null;
  fromDate: string;
  untilDate: string | null;
  location: string | null;
  activityType: string;
}

export interface PortalPayment {
  molliePaymentId: string;
  description: string;
  amount: number;
  currency: string;
  method: string | null;
  /** open, pending, authorized, paid, failed, canceled of expired */
  currentStatus: string;
  createdAt: string;
}

export interface PortalPaymentStatus {
  molliePaymentId: string;
  status: string;
  createdAt: string;
}

export interface PortalDocument {
  documentId: string;
  displayname: string;
  mimeType: string | null;
  /** bytes */
  size: number;
  createdAt: string;
}

/** Een verzonden e-mail aan de hoofdboeker, zonder inhoud. */
export interface PortalMessage {
  messageId: string;
  subject: string;
  fromAddress: string;
  /** opnieuw verstuurd door een medewerker */
  resent: boolean;
  createdAt: string;
}

export interface PortalMessageContent extends PortalMessage {
  /** de HTML zoals verstuurd; alleen tonen in een sandbox-iframe zonder scripts */
  bodyHtml: string;
}

export interface PaymentCreateResponse {
  id: string;
  status: string;
  _links?: {
    checkout?: { href: string };
  };
}
