import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Address } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private api = inject(ApiService);
  private readonly endpoint = 'addresses';

  getAll() {
    return this.api.getAll<Address>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Address>(this.endpoint, id);
  }
}
