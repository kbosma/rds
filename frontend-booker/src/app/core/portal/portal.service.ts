import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  PaymentCreateResponse,
  PortalActivity,
  PortalDocument,
  PortalMessage,
  PortalMessageContent,
  PortalOverview,
  PortalPayment,
  PortalPaymentStatus,
  PortalStay,
} from '../../shared/models/portal.models';

/** Alle aanroepen van het boekerportaal. Elke aanroep is gebonden aan de boeking uit het token. */
@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/booker-portal';

  getOverview() {
    return this.http.get<PortalOverview>(`${this.base}/overview`);
  }

  getStays() {
    return this.http.get<PortalStay[]>(`${this.base}/booking-lines`);
  }

  getActivities() {
    return this.http.get<PortalActivity[]>(`${this.base}/booking-activities`);
  }

  getPayments() {
    return this.http.get<PortalPayment[]>(`${this.base}/payments`);
  }

  getPaymentStatuses() {
    return this.http.get<PortalPaymentStatus[]>(`${this.base}/payments/status-entries`);
  }

  getDocuments() {
    return this.http.get<PortalDocument[]>(`${this.base}/documents`);
  }

  getMessages() {
    return this.http.get<PortalMessage[]>(`${this.base}/messages`);
  }

  getMessage(messageId: string) {
    return this.http.get<PortalMessageContent>(`${this.base}/messages/${messageId}`);
  }

  downloadDocument(documentId: string) {
    return this.http.get(`${this.base}/documents/${documentId}/content`, { responseType: 'blob' });
  }

  initiatePayment(molliePaymentId: string) {
    return this.http.post<PaymentCreateResponse>(`${this.base}/payments/pay/${molliePaymentId}`, {});
  }
}
