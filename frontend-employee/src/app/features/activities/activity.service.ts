import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Activity } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private api = inject(ApiService);
  private readonly endpoint = 'activities';

  getAll() {
    return this.api.getAll<Activity>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<Activity>(this.endpoint, id);
  }

  create(activity: Partial<Activity>) {
    return this.api.create<Activity>(this.endpoint, activity);
  }

  update(id: string, activity: Partial<Activity>) {
    return this.api.update<Activity>(this.endpoint, id, activity);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }
}
