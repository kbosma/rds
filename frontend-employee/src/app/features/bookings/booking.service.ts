import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { Booking, BookingStatusChange, QuoteSendResult } from '../../shared/models';

export type { Booking } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'bookings';

  getAll() {
    return this.api.getAll<Booking>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Booking>(this.endpoint, id);
  }

  create(booking: Partial<Booking>) {
    return this.api.create<Booking>(this.endpoint, booking);
  }

  update(id: string, booking: Partial<Booking>) {
    return this.api.update<Booking>(this.endpoint, id, booking);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  /** Verstuurt de offerte (PDF als bijlage) naar de hoofdboeker; de boeking komt op Offerte te staan. */
  sendQuote(id: string): Observable<QuoteSendResult> {
    return this.http.post<QuoteSendResult>(`${environment.apiUrl}/${this.endpoint}/${id}/send-quote`, null);
  }

  /** Zet de status terug naar een eerdere status, met reden (na een betaling alleen een manager). */
  revertStatus(id: string, targetStatus: string, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`${environment.apiUrl}/${this.endpoint}/${id}/status-revert`, { targetStatus, reason });
  }

  /** Rondt de boeking af. */
  complete(id: string, reason?: string): Observable<Booking> {
    return this.http.post<Booking>(`${environment.apiUrl}/${this.endpoint}/${id}/complete`, { reason: reason ?? null });
  }

  /** De statusgeschiedenis, nieuwste eerst. */
  statusChanges(id: string): Observable<BookingStatusChange[]> {
    return this.http.get<BookingStatusChange[]>(`${environment.apiUrl}/${this.endpoint}/${id}/status-changes`);
  }
}
