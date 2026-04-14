import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, TokenPayload, TotpSetupResponse } from '../../shared/models';

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
      personId: payload.personId ?? '',
      personName: payload.personName ?? '',
      organizationName: payload.organizationName ?? '',
      roles: payload.roles ?? [],
      authorities: payload.authorities ?? [],
    };
  });

  mustChangePassword = signal(false);
  requiresTotp = signal(false);
  requiresTotpSetup = signal(false);
  pendingTempToken = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  login(userName: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { userName, password })
      .pipe(
        tap((res) => {
          if (res.requiresTotp) {
            this.requiresTotp.set(true);
            this.requiresTotpSetup.set(res.requiresTotpSetup ?? false);
            this.pendingTempToken.set(res.tempToken);
          } else {
            this.completeLogin(res);
          }
        })
      );
  }

  loginWithTotp(totpCode: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login/totp`, {
        tempToken: this.pendingTempToken(),
        totpCode,
      })
      .pipe(tap((res) => this.completeLogin(res)));
  }

  loginWithRecovery(recoveryCode: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login/recovery`, {
        tempToken: this.pendingTempToken(),
        recoveryCode,
      })
      .pipe(tap((res) => this.completeLogin(res)));
  }

  setupTotp() {
    return this.http.post<TotpSetupResponse>(`${environment.apiUrl}/auth/totp/setup`, {});
  }

  verifyTotp(totpCode: string) {
    return this.http.post(`${environment.apiUrl}/auth/totp/verify`, { totpCode });
  }

  disableTotp(totpCode: string) {
    return this.http.post(`${environment.apiUrl}/auth/totp/disable`, { totpCode });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http
      .put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.mustChangePassword.set(false)));
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
    this.resetTotpState();
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

  resetTotpState() {
    this.requiresTotp.set(false);
    this.requiresTotpSetup.set(false);
    this.pendingTempToken.set(null);
  }

  private completeLogin(res: LoginResponse) {
    if (res.token) {
      localStorage.setItem(this.TOKEN_KEY, res.token);
      this.tokenSignal.set(res.token);
      this.mustChangePassword.set(res.mustChangePassword ?? false);
      this.resetTotpState();
    }
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
