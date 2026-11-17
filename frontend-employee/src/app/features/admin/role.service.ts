import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Role } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private api = inject(ApiService);
  private readonly endpoint = 'roles';

  /** De rollen van de eigen organisatie; een beheerder kan een organisatie opgeven. */
  getAll(organizationId?: string) {
    return this.api.getAll<Role>(this.endpoint, organizationId ? { organizationId } : undefined);
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
