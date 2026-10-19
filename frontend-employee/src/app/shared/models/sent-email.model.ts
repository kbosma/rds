/** Een verzonden e-mail aan de hoofdboeker van een boeking, bewaard zoals hij verstuurd is (alleen-toevoegen). */
export interface SentEmail {
  sentEmailId: string;
  bookingId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyHtml: string;
  /** Gevuld als dit een opnieuw verzonden kopie is van een eerdere mail. */
  resentFromId: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}
