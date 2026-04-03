import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AccommodationAddress } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccommodationAddressService {
  private api = inject(ApiService);
  private readonly endpoint = 'accommodation-addresses';

  getAll() {
    return this.api.getAll<AccommodationAddress>(this.endpoint);
  }

  create(link: AccommodationAddress) {
    return this.api.create<AccommodationAddress>(this.endpoint, link);
  }

  delete(accommodationId: string, addressId: string) {
    return this.api.delete(this.endpoint, `${accommodationId}/${addressId}`);
  }
}
