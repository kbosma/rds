import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { MolliePayment, MolliePaymentStatusEntry, PaymentRelink } from '../../shared/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MolliePaymentService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'mollie/payments';

  getAll() {
    return this.api.getAll<MolliePayment>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<MolliePayment>(this.endpoint, id);
  }

  create(payment: Partial<MolliePayment>) {
    return this.api.create<MolliePayment>(this.endpoint, payment);
  }

  update(id: string, payment: Partial<MolliePayment>) {
    return this.api.update<MolliePayment>(this.endpoint, id, payment);
  }

  createAtMollie(request: { amount: { currency: string; value: string }; description: string; redirectUrl: string; webhookUrl: string; metadata?: Record<string, string> }) {
    return this.http.post<MolliePayment>(`${environment.apiUrl}/${this.endpoint}/create-at-mollie`, request);
  }

  getStatusEntries(molliePaymentId: string) {
    return this.http.get<MolliePaymentStatusEntry[]>(`${environment.apiUrl}/mollie/payment-status-entries/by-payment/${molliePaymentId}`);
  }

  /**
   * Registreert een handmatige correctie van de status (nieuwe regel in de historie, met reden). Een bestaande
   * regel wijzigen of verwijderen kan niet: de statushistorie is alleen-toevoegen.
   */
  createCorrection(molliePaymentId: string, status: string, reason: string) {
    return this.http.post<MolliePaymentStatusEntry>(
      `${environment.apiUrl}/mollie/payment-status-entries/by-payment/${molliePaymentId}`, { status, reason });
  }

  /** De geregistreerde herkoppelingen van een betaling, oudste eerst. */
  getRelinks(molliePaymentId: string) {
    return this.http.get<PaymentRelink[]>(`${environment.apiUrl}/booking-mollie-payments/${molliePaymentId}/relinks`);
  }

  /**
   * Koppelt een betaling aan een andere boeking, met reden. Een koppeling wordt nooit losgemaakt: dit registreert een
   * herkoppeling die alleen-toevoegen is.
   */
  relink(molliePaymentId: string, targetBookingId: string, reason: string) {
    return this.http.post<PaymentRelink>(
      `${environment.apiUrl}/booking-mollie-payments/${molliePaymentId}/relink`, { targetBookingId, reason });
  }

  getAllStatusEntries() {
    return this.http.get<MolliePaymentStatusEntry[]>(`${environment.apiUrl}/mollie/payment-status-entries`);
  }
}
