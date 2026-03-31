import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Account } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private api = inject(ApiService);
  private readonly endpoint = 'accounts';

  getAll() {
    return this.api.getAll<Account>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Account>(this.endpoint, id);
  }

  create(account: Partial<Account>) {
    return this.api.create<Account>(this.endpoint, account);
  }

  update(id: string, account: Partial<Account>) {
    return this.api.update<Account>(this.endpoint, id, account);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
