import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SentEmail } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class SentEmailService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sent-emails`;

  getByBookingId(bookingId: string): Observable<SentEmail[]> {
    return this.http.get<SentEmail[]>(`${this.baseUrl}/booking/${bookingId}`);
  }

  /** Verstuurt dezelfde inhoud opnieuw naar hetzelfde adres; de kopie komt als nieuwe regel in de tijdlijn. */
  resend(sentEmailId: string): Observable<SentEmail> {
    return this.http.post<SentEmail>(`${this.baseUrl}/${sentEmailId}/resend`, {});
  }
}
