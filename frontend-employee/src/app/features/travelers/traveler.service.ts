import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Booker, Traveler } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class TravelerService {
  private api = inject(ApiService);
  private readonly endpoint = 'travelers';

  getAll() {
    return this.api.getAll<Traveler>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Traveler>(this.endpoint, id);
  }

  create(traveler: Partial<Traveler>) {
    return this.api.create<Traveler>(this.endpoint, traveler);
  }

  /** Voegt de hoofdboeker als reiziger aan de boeking toe (de persoonsgegevens die een reiziger ook heeft). */
  createFromBooker(bookingId: string, booker: Booker) {
    return this.create({
      bookingId,
      firstname: booker.firstname,
      prefix: booker.prefix,
      lastname: booker.lastname,
      initials: booker.initials,
      gender: booker.gender,
      birthdate: booker.birthdate,
    });
  }

  update(id: string, traveler: Partial<Traveler>) {
    return this.api.update<Traveler>(this.endpoint, id, traveler);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
