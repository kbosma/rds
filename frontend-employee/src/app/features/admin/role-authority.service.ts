import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoleAuthority } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class RoleAuthorityService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/role-authorities`;

  getAll(): Observable<RoleAuthority[]> {
    return this.http.get<RoleAuthority[]>(this.baseUrl);
  }

  create(roleId: string, authorityId: string): Observable<RoleAuthority> {
    return this.http.post<RoleAuthority>(this.baseUrl, { roleId, authorityId });
  }

  delete(roleId: string, authorityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${roleId}/${authorityId}`);
  }
}
