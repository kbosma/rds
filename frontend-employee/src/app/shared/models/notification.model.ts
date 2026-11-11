/** Een notificatie bij een boeking: iets dat een medewerker moet oppakken. */
export interface BookingNotification {
  notificationId: string;
  bookingId: string;
  bookingNumber: string;
  /** alles_betaald, op_reis, weer_thuis of terugboeking */
  kind: string;
  title: string;
  notifiedAt: string;
  handled: boolean;
  handledAt: string | null;
  handledBy: string | null;
  handledByName: string | null;
}

/** Eén statuswijziging van een boeking (statusgeschiedenis, alleen-toevoegen). */
export interface BookingStatusChange {
  bookingStatusChangeId: string;
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  /** true = door het systeem (betaling, datum); false = door een medewerker */
  automatic: boolean;
  reason: string;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
}
