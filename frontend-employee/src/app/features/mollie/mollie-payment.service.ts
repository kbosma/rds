import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { MolliePayment } from '../../shared/models';
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

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  createAtMollie(request: { amount: { currency: string; value: string }; description: string; redirectUrl: string; webhookUrl: string; metadata?: Record<string, string> }) {
    return this.http.post<MolliePayment>(`${environment.apiUrl}/${this.endpoint}/create-at-mollie`, request);
  }
}
