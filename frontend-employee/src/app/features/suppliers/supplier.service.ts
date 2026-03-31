import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Supplier } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private api = inject(ApiService);
  private readonly endpoint = 'suppliers';

  getAll() {
    return this.api.getAll<Supplier>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Supplier>(this.endpoint, id);
  }

  create(supplier: Partial<Supplier>) {
    return this.api.create<Supplier>(this.endpoint, supplier);
  }

  update(id: string, supplier: Partial<Supplier>) {
    return this.api.update<Supplier>(this.endpoint, id, supplier);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
