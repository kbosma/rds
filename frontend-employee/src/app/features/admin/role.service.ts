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

  create(role: Partial<Role>) {
    return this.api.create<Role>(this.endpoint, role);
  }

  update(id: string, role: Partial<Role>) {
    return this.api.update<Role>(this.endpoint, id, role);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
