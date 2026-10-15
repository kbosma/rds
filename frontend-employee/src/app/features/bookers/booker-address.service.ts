import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { BookerAddress } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookerAddressService {
  private api = inject(ApiService);
  private readonly endpoint = 'booker-addresses';

  getAll() {
    return this.api.getAll<BookerAddress>(this.endpoint);
  }

  create(link: BookerAddress) {
    return this.api.create<BookerAddress>(this.endpoint, link);
  }

  delete(bookerId: string, addressId: string) {
    return this.api.delete(this.endpoint, `${bookerId}/${addressId}`);
  }
}
