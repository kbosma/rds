import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrganizationTheme } from '../../shared/models';
import { ApiService } from '../../core/services/api.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private readonly endpoint = 'organization-themes';

  getAll() {
    return this.api.getAll<OrganizationTheme>(this.endpoint);
  }

  getById(id: string) {
    return this.api.getById<OrganizationTheme>(this.endpoint, id);
  }

  getMyTheme(): Observable<OrganizationTheme> {
    return this.http.get<OrganizationTheme>(`${environment.apiUrl}/${this.endpoint}/my-theme`);
  }

  create(theme: Partial<OrganizationTheme>) {
    return this.api.create<OrganizationTheme>(this.endpoint, theme);
  }

  update(id: string, theme: Partial<OrganizationTheme>) {
    return this.api.update<OrganizationTheme>(this.endpoint, id, theme);
  }

  delete(id: string) {
    return this.api.delete(this.endpoint, id);
  }

  applyTheme(theme: OrganizationTheme): void {
    document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    document.documentElement.style.setProperty('--theme-accent', theme.accentColor);
    if (theme.cardTitleColor) {
      document.documentElement.style.setProperty('--theme-card-title', theme.cardTitleColor);
    } else {
      document.documentElement.style.removeProperty('--theme-card-title');
    }
  }

  loadAndApplyTheme(): void {
    this.getMyTheme().subscribe({
      next: (theme) => this.applyTheme(theme),
      error: () => {
        // No theme found — defaults from CSS apply
      },
    });
  }
}
