import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingLine } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookingLineService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/booking-lines`;

  getAll(): Observable<BookingLine[]> {
    return this.http.get<BookingLine[]>(this.baseUrl);
  }

  getByBookingId(bookingId: string): Observable<BookingLine[]> {
    return this.http.get<BookingLine[]>(`${this.baseUrl}/${bookingId}`);
  }

  getById(bookingId: string, accommodationId: string, supplierId: string): Observable<BookingLine> {
    return this.http.get<BookingLine>(`${this.baseUrl}/${bookingId}/${accommodationId}/${supplierId}`);
  }

  create(bookingLine: Partial<BookingLine>): Observable<BookingLine> {
    return this.http.post<BookingLine>(this.baseUrl, bookingLine);
  }

  update(bookingId: string, accommodationId: string, supplierId: string, bookingLine: Partial<BookingLine>): Observable<BookingLine> {
    return this.http.put<BookingLine>(`${this.baseUrl}/${bookingId}/${accommodationId}/${supplierId}`, bookingLine);
  }

  delete(bookingId: string, accommodationId: string, supplierId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bookingId}/${accommodationId}/${supplierId}`);
  }
}
