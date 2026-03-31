import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

interface BookerLoginResponse {
  token: string;
  bookerId: string;
  bookingId: string;
}

interface BookerTokenPayload {
  sub: string;
  type: string;
  bookingId: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class BookerAuthService {
  private readonly TOKEN_KEY = 'rds_booker_token';

  private tokenSignal = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    const payload = this.decodeToken(token);
    return payload !== null && payload.exp * 1000 > Date.now();
  });

  currentBooker = computed(() => {
    const token = this.tokenSignal();
    if (!token) return null;
    const payload = this.decodeToken(token);
    if (!payload) return null;
    return {
      bookerId: payload.sub,
      bookingId: payload.bookingId,
    };
  });

  constructor(private http: HttpClient, private router: Router) {}

  requestOtp(emailaddress: string, bookingNumber: string) {
    return this.http.post('/api/booker-auth/request-otp', {
      emailaddress,
      bookingNumber,
    });
  }

  verifyOtp(emailaddress: string, bookingNumber: string, code: string) {
    return this.http
      .post<BookerLoginResponse>('/api/booker-auth/verify-otp', {
        emailaddress,
        bookingNumber,
        code,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.tokenSignal.set(res.token);
        })
      );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private decodeToken(token: string): BookerTokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
