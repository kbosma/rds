import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('genereert standaard een document dat niet in het portaal zichtbaar is', () => {
    service.generate('t-1', 'b-1', 'pdf').subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/documents/generate'));
    expect(req.request.body).toEqual({ templateId: 't-1', bookingId: 'b-1', outputFormat: 'pdf', visibleInPortal: false });
    req.flush({});
  });

  it('kan een document zichtbaar in het portaal genereren', () => {
    service.generate('t-1', 'b-1', 'docx', true).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/documents/generate'));
    expect(req.request.body.visibleInPortal).toBeTrue();
    req.flush({});
  });

  it('wijzigt van een bestaand document alleen de portaalzichtbaarheid via PUT', () => {
    service.setPortalVisibility('d-1', true).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/documents/d-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ visibleInPortal: true });
    req.flush({});
  });
});
