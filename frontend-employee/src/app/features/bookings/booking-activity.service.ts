import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingActivity } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class BookingActivityService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/booking-activities`;

  getAll(): Observable<BookingActivity[]> {
    return this.http.get<BookingActivity[]>(this.baseUrl);
  }

  getByBookingId(bookingId: string): Observable<BookingActivity[]> {
    return this.http.get<BookingActivity[]>(`${this.baseUrl}/booking/${bookingId}`);
  }

  getById(bookingActivityId: string): Observable<BookingActivity> {
    return this.http.get<BookingActivity>(`${this.baseUrl}/${bookingActivityId}`);
  }

  create(bookingActivity: Partial<BookingActivity>): Observable<BookingActivity> {
    return this.http.post<BookingActivity>(this.baseUrl, bookingActivity);
  }

  update(bookingActivityId: string, bookingActivity: Partial<BookingActivity>): Observable<BookingActivity> {
    return this.http.put<BookingActivity>(`${this.baseUrl}/${bookingActivityId}`, bookingActivity);
  }

  delete(bookingActivityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bookingActivityId}`);
  }
}
