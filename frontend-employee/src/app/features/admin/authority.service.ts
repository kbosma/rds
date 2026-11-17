import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Authority } from '../../shared/models';

/** Authorities zijn alleen te lezen: ze komen uit Flyway. */
@Injectable({ providedIn: 'root' })
export class AuthorityService {
  private api = inject(ApiService);
  private readonly endpoint = 'authorities';

  getAll() {
    return this.api.getAll<Authority>(this.endpoint);
  }

  /** De authorities die de ingelogde gebruiker aan een rol mag geven. */
  getGrantable() {
    return this.api.getAll<Authority>(`${this.endpoint}/grantable`);
  }
}
