export interface Address {
  addressId: string;
  street: string;
  housenumber: number;
  housenumberAddition: string | null;
  postalcode: string;
  city: string;
  country: string;
  addressrole: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
