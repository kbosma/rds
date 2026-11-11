/** Uitkomst van "offerte versturen". */
export interface QuoteSendResult {
  bookingId: string;
  bookingStatus: string;
  documentId: string;
  documentName: string;
  to: string;
  subject: string;
}
