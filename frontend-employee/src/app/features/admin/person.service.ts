import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Person } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private api = inject(ApiService);
  private readonly endpoint = 'persons';

  getAll() {
    return this.api.getAll<Person>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Person>(this.endpoint, id);
  }

  create(person: Partial<Person>) {
    return this.api.create<Person>(this.endpoint, person);
  }

  update(id: string, person: Partial<Person>) {
    return this.api.update<Person>(this.endpoint, id, person);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
