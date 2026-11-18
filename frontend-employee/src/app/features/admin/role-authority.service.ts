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

}
