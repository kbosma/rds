import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Authority } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthorityService {
  private api = inject(ApiService);
  private readonly endpoint = 'authorities';

  getAll() {
    return this.api.getAll<Authority>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Authority>(this.endpoint, id);
  }

  create(authority: Partial<Authority>) {
    return this.api.create<Authority>(this.endpoint, authority);
  }

  update(id: string, authority: Partial<Authority>) {
    return this.api.update<Authority>(this.endpoint, id, authority);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
