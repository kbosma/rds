import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/services/api.service';
import { Authority, Role } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'roles';

  /** De rollen van de eigen organisatie; een beheerder kan een organisatie opgeven. */
  getAll(organizationId?: string) {
    return this.api.getAll<Role>(this.endpoint, organizationId ? { organizationId } : undefined);
  }

  getById(id: string) {
    return this.api.getById<Role>(this.endpoint, id);
  }

  /** Een eigen rol, met {@code role.authorities} als zijn rechten (plus vereisten). */
  create(role: Partial<Role>) {
    return this.api.create<Role>(this.endpoint, role);
  }

  /** Uitdeelbare rechten die nieuw zijn sinds de organisatie ze voor het laatst bekeek. */
  getNewAuthorities() {
    return this.http.get<Authority[]>(`${environment.apiUrl}/${this.endpoint}/new-authorities`);
  }

  markNewAuthoritiesSeen() {
    return this.http.post<void>(`${environment.apiUrl}/${this.endpoint}/new-authorities/seen`, {});
  }

  /** Naam en, met {@code role.authorities}, de rechten in één keer; de server slaat alleen het verschil op. */
  update(id: string, role: Partial<Role>) {
    return this.api.update<Role>(this.endpoint, id, role);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
