import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountRole, Role } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccountRoleService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/account-roles`;

  getAll(): Observable<AccountRole[]> {
    return this.http.get<AccountRole[]>(this.baseUrl);
  }

  /** Rollen die de ingelogde gebruiker mag toewijzen en intrekken (bepaald door de backend). */
  getAssignable(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/assignable-roles`);
  }

  create(accountId: string, roleId: string): Observable<AccountRole> {
    return this.http.post<AccountRole>(this.baseUrl, { accountId, roleId });
  }

  delete(accountId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${accountId}/${roleId}`);
  }
}
