import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { EmailTemplateService } from './email-template.service';
import { ApiService } from '../../core/services/api.service';
import { EmailTemplate, EmailRender, EmailSendResult } from '../../shared/models';

/*
 * EmailTemplateService is een dunne laag bovenop ApiService voor CRUD, met één
 * eigen HttpClient-call: render(). We mocken ApiService (al apart getest) en
 * gebruiken HttpTestingController om de render-POST te verifiëren.
 */
describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let httpMock: HttpTestingController;

  const mockTemplate: EmailTemplate = {
    emailTemplateId: 'tpl-1',
    name: 'Welkom',
    description: 'Welkomstmail',
    subject: 'Welkom {{prospect.firstname}}',
    bodyHtml: '<p>Hallo</p>',
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
    tenantOrganization: 'org-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'getById', 'create', 'update', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(EmailTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() should call ApiService.getAll with "email-templates"', () => {
    apiSpy.getAll.and.returnValue(of([mockTemplate]));

    service.getAll().subscribe((result) => expect(result).toEqual([mockTemplate]));

    expect(apiSpy.getAll).toHaveBeenCalledWith('email-templates');
  });

  it('getById() should pass the id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mockTemplate));

    service.getById('tpl-1').subscribe();

    expect(apiSpy.getById).toHaveBeenCalledWith('email-templates', 'tpl-1');
  });

  it('create() should pass the template data to ApiService', () => {
    const payload: Partial<EmailTemplate> = { name: 'Welkom', subject: 's', bodyHtml: '<p>x</p>' };
    apiSpy.create.and.returnValue(of(mockTemplate));

    service.create(payload).subscribe();

    expect(apiSpy.create).toHaveBeenCalledWith('email-templates', payload);
  });

  it('update() should pass id and data to ApiService', () => {
    const changes: Partial<EmailTemplate> = { subject: 'nieuw' };
    apiSpy.update.and.returnValue(of(mockTemplate));

    service.update('tpl-1', changes).subscribe();

    expect(apiSpy.update).toHaveBeenCalledWith('email-templates', 'tpl-1', changes);
  });

  it('delete() should pass the id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));

    service.delete('tpl-1').subscribe();

    expect(apiSpy.delete).toHaveBeenCalledWith('email-templates', 'tpl-1');
  });

  it('render() should POST to the render endpoint with a bookerId param', () => {
    const expected: EmailRender = { subject: 'Welkom Klaas', bodyHtml: '<p>Hallo Klaas</p>' };
    let actual: EmailRender | undefined;

    service.render('tpl-1', 'booker-9').subscribe((r) => (actual = r));

    const req = httpMock.expectOne(
      (r) => r.url === '/api/email-templates/tpl-1/render' && r.params.get('bookerId') === 'booker-9'
    );
    expect(req.request.method).toBe('POST');
    req.flush(expected);

    expect(actual).toEqual(expected);
  });

  it('send() should POST to the send endpoint with a bookerId param', () => {
    const expected: EmailSendResult = { to: 'klaas@example.com', from: 'noreply@puurkroatie.nl', subject: 'Welkom Klaas' };
    let actual: EmailSendResult | undefined;

    service.send('tpl-1', 'booker-9').subscribe((r) => (actual = r));

    const req = httpMock.expectOne(
      (r) => r.url === '/api/email-templates/tpl-1/send' && r.params.get('bookerId') === 'booker-9'
    );
    expect(req.request.method).toBe('POST');
    req.flush(expected);

    expect(actual).toEqual(expected);
  });

  it('renderForBooking() should POST to the render endpoint with a bookingId param (and no bookerId)', () => {
    const expected: EmailRender = { subject: 'Boeking B-1', bodyHtml: '<p>Hallo</p>' };
    let actual: EmailRender | undefined;

    service.renderForBooking('tpl-1', 'booking-7').subscribe((r) => (actual = r));

    const req = httpMock.expectOne(
      (r) => r.url === '/api/email-templates/tpl-1/render'
        && r.params.get('bookingId') === 'booking-7' && !r.params.has('bookerId')
    );
    expect(req.request.method).toBe('POST');
    req.flush(expected);

    expect(actual).toEqual(expected);
  });

  it('sendForBooking() should POST to the send endpoint with a bookingId param (and no bookerId)', () => {
    const expected: EmailSendResult = { to: 'klaas@example.com', from: 'noreply@puurkroatie.nl', subject: 'Boeking B-1' };
    let actual: EmailSendResult | undefined;

    service.sendForBooking('tpl-1', 'booking-7').subscribe((r) => (actual = r));

    const req = httpMock.expectOne(
      (r) => r.url === '/api/email-templates/tpl-1/send'
        && r.params.get('bookingId') === 'booking-7' && !r.params.has('bookerId')
    );
    expect(req.request.method).toBe('POST');
    req.flush(expected);

    expect(actual).toEqual(expected);
  });
});
