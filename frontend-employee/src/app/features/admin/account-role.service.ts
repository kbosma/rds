import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountRole } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccountRoleService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/account-roles`;

  getAll(): Observable<AccountRole[]> {
    return this.http.get<AccountRole[]>(this.baseUrl);
  }
}
