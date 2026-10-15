import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { EmailTemplate, EmailRender, EmailSendResult } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'email-templates';
  private readonly baseUrl = environment.apiUrl;

  getAll() {
    return this.api.getAll<EmailTemplate>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<EmailTemplate>(this.endpoint, id);
  }

  create(template: Partial<EmailTemplate>) {
    return this.api.create<EmailTemplate>(this.endpoint, template);
  }

  update(id: string, template: Partial<EmailTemplate>) {
    return this.api.update<EmailTemplate>(this.endpoint, id, template);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  /** Merge-preview: template + booker -> gerenderde subject + HTML. */
  render(id: string, bookerId: string) {
    const params = new HttpParams({ fromObject: { bookerId } });
    return this.http.post<EmailRender>(`${this.baseUrl}/${this.endpoint}/${id}/render`, null, { params });
  }

  /** Verstuurt de gemergde template daadwerkelijk naar de booker. */
  send(id: string, bookerId: string) {
    const params = new HttpParams({ fromObject: { bookerId } });
    return this.http.post<EmailSendResult>(`${this.baseUrl}/${this.endpoint}/${id}/send`, null, { params });
  }

  /** Merge-preview voor een boeking: de template met de gegevens van de boeking (de ontvanger is de hoofdboeker). */
  renderForBooking(id: string, bookingId: string) {
    const params = new HttpParams({ fromObject: { bookingId } });
    return this.http.post<EmailRender>(`${this.baseUrl}/${this.endpoint}/${id}/render`, null, { params });
  }

  /** Verstuurt de template, gemerged met de boeking, naar de hoofdboeker van die boeking. */
  sendForBooking(id: string, bookingId: string) {
    const params = new HttpParams({ fromObject: { bookingId } });
    return this.http.post<EmailSendResult>(`${this.baseUrl}/${this.endpoint}/${id}/send`, null, { params });
  }
}
