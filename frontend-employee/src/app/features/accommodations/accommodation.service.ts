import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Accommodation } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccommodationService {
  private api = inject(ApiService);
  private readonly endpoint = 'accommodations';

  getAll() {
    return this.api.getAll<Accommodation>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Accommodation>(this.endpoint, id);
  }

  create(accommodation: Partial<Accommodation>) {
    return this.api.create<Accommodation>(this.endpoint, accommodation);
  }

  update(id: string, accommodation: Partial<Accommodation>) {
    return this.api.update<Accommodation>(this.endpoint, id, accommodation);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
