import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { Document } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'documents';

  getByBookingId(bookingId: string) {
    return this.api.getAll<Document>(`${this.endpoint}/booking/${bookingId}`);
  }

  create(document: Partial<Document>) {
    return this.api.create<Document>(this.endpoint, document);
  }

  /** Het enige wat van een bestaand document nog wijzigt: of de boeker het in het portaal ziet. */
  setPortalVisibility(id: string, visibleInPortal: boolean) {
    return this.http.put<Document>(`${environment.apiUrl}/${this.endpoint}/${id}`, { visibleInPortal });
  }

  getContent(id: string) {
    return this.http.get(`${environment.apiUrl}/${this.endpoint}/${id}/content`, { responseType: 'blob' });
  }

  generate(templateId: string, bookingId: string, outputFormat: string, visibleInPortal = false) {
    return this.http.post<Document>(`${environment.apiUrl}/${this.endpoint}/generate`, { templateId, bookingId, outputFormat, visibleInPortal });
  }
}
