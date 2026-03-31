import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, TokenPayload } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'rds_token';

  private tokenSignal = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    const payload = this.decodeToken(token);
    return payload !== null && payload.exp * 1000 > Date.now();
  });

  currentUser = computed(() => {
    const token = this.tokenSignal();
    if (!token) return null;
    const payload = this.decodeToken(token);
    if (!payload) return null;
    return {
      accountId: payload.sub,
      organizationId: payload.org,
      roles: payload.roles ?? [],
      authorities: payload.authorities ?? [],
    };
  });

  mustChangePassword = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  login(userName: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { userName, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.tokenSignal.set(res.token);
          this.mustChangePassword.set(res.mustChangePassword);
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http
      .put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.mustChangePassword.set(false)));
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  hasAuthority(authority: string): boolean {
    return this.currentUser()?.authorities.includes(authority) ?? false;
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
