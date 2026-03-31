export interface BookingLine {
  bookingId: string;
  accommodationId: string;
  supplierId: string;
  accommodationName: string;
  supplierName: string;
  fromDate: string;
  untilDate: string;
  totalSum: number;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
