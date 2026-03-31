import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Booker } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookerService {
  private api = inject(ApiService);
  private readonly endpoint = 'bookers';

  getAll() {
    return this.api.getAll<Booker>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Booker>(this.endpoint, id);
  }

  create(booker: Partial<Booker>) {
    return this.api.create<Booker>(this.endpoint, booker);
  }

  update(id: string, booker: Partial<Booker>) {
    return this.api.update<Booker>(this.endpoint, id, booker);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
