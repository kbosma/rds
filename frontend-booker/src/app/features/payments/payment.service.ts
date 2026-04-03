import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MolliePayment, MolliePaymentStatusEntry, PaymentCreateResponse } from '../../shared/models/mollie-payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) {}

  getPayments(): Observable<MolliePayment[]> {
    return this.http.get<MolliePayment[]>('/api/booker-portal/payments');
  }

  initiatePayment(molliePaymentId: string): Observable<PaymentCreateResponse> {
    return this.http.post<PaymentCreateResponse>(
      `/api/booker-portal/payments/pay/${molliePaymentId}`, {}
    );
  }

  getStatusEntries(): Observable<MolliePaymentStatusEntry[]> {
    return this.http.get<MolliePaymentStatusEntry[]>('/api/booker-portal/payments/status-entries');
  }
}
