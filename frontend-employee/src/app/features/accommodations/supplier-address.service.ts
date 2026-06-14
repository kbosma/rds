import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { SupplierAddress } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class SupplierAddressService {
  private api = inject(ApiService);
  private readonly endpoint = 'supplier-addresses';

  getAll() {
    return this.api.getAll<SupplierAddress>(this.endpoint);
  }

  create(link: SupplierAddress) {
    return this.api.create<SupplierAddress>(this.endpoint, link);
  }

  delete(supplierId: string, addressId: string) {
    return this.api.delete(this.endpoint, `${supplierId}/${addressId}`);
  }
}
