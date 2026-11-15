import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingNotification } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications`;

  /** Openstaande notificaties van de eigen organisatie, nieuwste eerst. */
  getOpen(): Observable<BookingNotification[]> {
    return this.http.get<BookingNotification[]>(`${this.url}/open`);
  }

  /** Alle notificaties van een boeking, nieuwste eerst. */
  getByBooking(bookingId: string): Observable<BookingNotification[]> {
    return this.http.get<BookingNotification[]>(`${this.url}/booking/${bookingId}`);
  }

  handle(notificationId: string): Observable<BookingNotification> {
    return this.http.post<BookingNotification>(`${this.url}/${notificationId}/handle`, null);
  }
}
