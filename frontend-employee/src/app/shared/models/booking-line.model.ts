export interface BookingLine {
  bookingLineId: string;
  bookingId: string;
  accommodationId: string;
  supplierId: string;
  accommodationName: string;
  supplierName: string;
  fromDate: string;
  untilDate: string;
  price: number;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
