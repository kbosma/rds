import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { DocumentTemplate } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'document-templates';

  getAll() {
    return this.api.getAll<DocumentTemplate>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<DocumentTemplate>(this.endpoint, id);
  }

  create(template: Partial<DocumentTemplate> & { templateData?: number[] }) {
    return this.api.create<DocumentTemplate>(this.endpoint, template);
  }

  update(id: string, template: Partial<DocumentTemplate> & { templateData?: number[] }) {
    return this.api.update<DocumentTemplate>(this.endpoint, id, template);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  getContent(id: string) {
    return this.http.get(`${environment.apiUrl}/${this.endpoint}/${id}/content`, { responseType: 'blob' });
  }
}
