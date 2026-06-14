import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AccommodationSupplier } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccommodationSupplierService {
  private api = inject(ApiService);
  private readonly endpoint = 'accommodation-suppliers';

  getAll() {
    return this.api.getAll<AccommodationSupplier>(this.endpoint);
  }

  create(link: AccommodationSupplier) {
    return this.api.create<AccommodationSupplier>(this.endpoint, link);
  }

  delete(accommodationId: string, supplierId: string) {
    return this.api.delete(this.endpoint, `${accommodationId}/${supplierId}`);
  }
}
