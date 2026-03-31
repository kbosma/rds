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
}
