import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Organization } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private api = inject(ApiService);
  private readonly endpoint = 'organizations';

  getAll() {
    return this.api.getAll<Organization>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Organization>(this.endpoint, id);
  }

  create(organization: Partial<Organization>) {
    return this.api.create<Organization>(this.endpoint, organization);
  }

  update(id: string, organization: Partial<Organization>) {
    return this.api.update<Organization>(this.endpoint, id, organization);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
