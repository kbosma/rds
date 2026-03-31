import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Booking } from '../../shared/models';

export type { Booking } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = inject(ApiService);
  private readonly endpoint = 'bookings';

  getAll() {
    return this.api.getAll<Booking>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Booking>(this.endpoint, id);
  }

  create(booking: Partial<Booking>) {
    return this.api.create<Booking>(this.endpoint, booking);
  }

  update(id: string, booking: Partial<Booking>) {
    return this.api.update<Booking>(this.endpoint, id, booking);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
