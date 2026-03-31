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
}
