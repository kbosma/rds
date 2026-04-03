import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Role } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private api = inject(ApiService);
  private readonly endpoint = 'roles';

  getAll() {
    return this.api.getAll<Role>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Role>(this.endpoint, id);
  }
}
