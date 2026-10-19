import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SentEmailService } from './sent-email.service';

describe('SentEmailService', () => {
  let service: SentEmailService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SentEmailService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('haalt de verzonden e-mails van een boeking op via GET', () => {
    service.getByBookingId('b-1').subscribe((r) => expect(r.length).toBe(1));

    const req = http.expectOne((r) => r.url.endsWith('/sent-emails/booking/b-1'));
    expect(req.request.method).toBe('GET');
    req.flush([{ sentEmailId: 'e-1' }]);
  });

  it('verstuurt een e-mail opnieuw via POST (geen wijzigen of verwijderen)', () => {
    service.resend('e-1').subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/sent-emails/e-1/resend'));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
