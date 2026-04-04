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

  getAll() {
    return this.api.getAll<Document>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Document>(this.endpoint, id);
  }

  getByBookingId(bookingId: string) {
    return this.api.getAll<Document>(`${this.endpoint}/booking/${bookingId}`);
  }

  create(document: Partial<Document>) {
    return this.api.create<Document>(this.endpoint, document);
  }

  update(id: string, document: Partial<Document>) {
    return this.api.update<Document>(this.endpoint, id, document);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  getContent(id: string) {
    return this.http.get(`${environment.apiUrl}/${this.endpoint}/${id}/content`, { responseType: 'blob' });
  }
}
