import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrganizationSettings } from '../../shared/models';

/** De instellingen van de eigen organisatie: lezen en (als MANAGER) bijwerken. */
@Injectable({ providedIn: 'root' })
export class OrganizationSettingsService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/organization-settings/mine`;

  getMine(): Observable<OrganizationSettings> {
    return this.http.get<OrganizationSettings>(this.url);
  }

  updateMine(settings: Pick<OrganizationSettings, 'quoteDocumentTemplateId' | 'quoteEmailTemplateId'>): Observable<OrganizationSettings> {
    return this.http.put<OrganizationSettings>(this.url, settings);
  }
}
