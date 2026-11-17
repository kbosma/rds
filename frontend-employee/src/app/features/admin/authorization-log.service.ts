import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthorizationLogEntry } from '../../shared/models';

/** Het rechtenlogboek (alleen lezen): wie gaf of nam wanneer welke rol of welk recht. */
@Injectable({ providedIn: 'root' })
export class AuthorizationLogService {
  private api = inject(ApiService);

  getForRole(roleId: string) {
    return this.api.getAll<AuthorizationLogEntry>('authorization-log', { roleId });
  }
}
