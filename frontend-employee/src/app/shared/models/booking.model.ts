export interface Booking {
  bookingId: string;
  bookerId: string;
  bookingNumber: string;
  bookingStatus: string;
  fromDate: string;
  untilDate: string;
  totalSum: number;
  /** De hoofdboeker heeft de (laatste) offerte bevestigd. */
  quoteConfirmed: boolean;
  /** Moment van bevestigen (gezet door de server). */
  quoteConfirmedAt: string | null;
  tenantOrganization: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
