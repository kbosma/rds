export interface Document {
  documentId: string;
  bookingId: string;
  displayname: string;
  mimeType: string;
  /** Of de boeker het document in het boekerportaal ziet (standaard niet). */
  visibleInPortal: boolean;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
