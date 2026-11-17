import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, map, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, TokenPayload, TotpSetupResponse } from '../../shared/models';
import { Access, isSatisfied } from './access';

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

  /**
   * De authorities van de ingelogde gebruiker. Een signal: alles wat ervan afhangt (computed, @if in een template)
   * tekent opnieuw zodra er een nieuw token is. Zichtbaarheid hangt altijd aan authorities, nooit aan rolnamen.
   */
  authorities = computed<readonly string[]>(() => this.currentUser()?.authorities ?? []);

  private refreshInFlight: Observable<string> | null = null;

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

  /**
   * Een nieuw token met de huidige rechten, na een wijziging in de rechten (backend: 401 AUTHZ_CHANGED). Gelijktijdige
   * aanroepen delen één verzoek. Het nieuwe token zet de signals bij, dus menu, routes en kaarten bewegen direct mee.
   */
  refreshToken(): Observable<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http.post<LoginResponse>(`${environment.apiUrl}/auth/token/refresh`, {}).pipe(
        map((res) => res.token!),
        tap((token) => this.storeToken(token)),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1),
      );
    }
    return this.refreshInFlight;
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

  hasAuthority(authority: string): boolean {
    return this.authorities().includes(authority);
  }

  /** Voldoet de gebruiker aan de eisen van een scherm of onderdeel (zie ACCESS)? */
  can(access: Access | undefined): boolean {
    return isSatisfied(access, this.authorities());
  }

  resetTotpState() {
    this.requiresTotp.set(false);
    this.requiresTotpSetup.set(false);
    this.pendingTempToken.set(null);
  }

  private completeLogin(res: LoginResponse) {
    if (res.token) {
      this.storeToken(res.token);
      this.mustChangePassword.set(res.mustChangePassword ?? false);
      this.resetTotpState();
    }
  }

  private storeToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.tokenSignal.set(token);
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
