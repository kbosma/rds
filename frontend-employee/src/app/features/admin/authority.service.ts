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
}
