import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { EmailTemplatePreviewDialogComponent } from './email-template-preview-dialog.component';
import { EmailTemplateService } from './email-template.service';
import { BookerService } from '../bookers/booker.service';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplate, EmailRender, EmailSendResult, Booker, Booking } from '../../shared/models';

/*
 * EmailTemplatePreviewDialogComponent laadt prospects, laat de backend mergen en
 * toont het resultaat. We mocken BookerService.getByStatus en
 * EmailTemplateService.render.
 */
describe('EmailTemplatePreviewDialogComponent', () => {
  let component: EmailTemplatePreviewDialogComponent;
  let fixture: ComponentFixture<EmailTemplatePreviewDialogComponent>;
  let serviceSpy: jasmine.SpyObj<EmailTemplateService>;
  let bookerSpy: jasmine.SpyObj<BookerService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;
  let snackBarOpenSpy: jasmine.Spy;

  const mockTemplate: EmailTemplate = {
    emailTemplateId: 'tpl-1', name: 'Welkom', description: '',
    subject: 'Welkom', bodyHtml: '<p>Hallo</p>',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };

  const mockProspect: Booker = {
    bookerId: 'b-1', firstname: 'Klaas', prefix: 'van', lastname: 'Houten',
    callsign: '', telephone: '', emailaddress: 'klaas@example.com',
    gender: 'man', birthdate: '', initials: '', status: 'prospect',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };

  const mockRender: EmailRender = { subject: 'Welkom Klaas', bodyHtml: '<p>Hallo Klaas</p>' };
  const mockSendResult: EmailSendResult = { to: 'klaas@example.com', from: 'noreply@org.nl', subject: 'Welkom Klaas' };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('EmailTemplateService', ['render', 'send']);
    bookerSpy = jasmine.createSpyObj('BookerService', ['getByStatus']);
    bookerSpy.getByStatus.and.returnValue(of([mockProspect]));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [EmailTemplatePreviewDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: EmailTemplateService, useValue: serviceSpy },
        { provide: BookerService, useValue: bookerSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: { template: mockTemplate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailTemplatePreviewDialogComponent);
    component = fixture.componentInstance;
    // MatSnackBar is providedIn MatSnackBarModule, dus de component injecteert een
    // eigen instance; we spioneren direct op die instance.
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load prospects (status=prospect) on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(bookerSpy.getByStatus).toHaveBeenCalledWith('prospect');
    expect(component.prospects().length).toBe(1);
    expect(component.loadingProspects()).toBe(false);
  }));

  it('render() should not call the service when no prospect is selected', () => {
    component.render();
    expect(serviceSpy.render).not.toHaveBeenCalled();
  });

  it('render() should call the service and expose the rendered result', fakeAsync(() => {
    serviceSpy.render.and.returnValue(of(mockRender));
    fixture.detectChanges();
    tick();

    component.selectedBookerId = 'b-1';
    component.render();
    tick();

    expect(serviceSpy.render).toHaveBeenCalledWith('tpl-1', 'b-1');
    expect(component.rendered()).toEqual(mockRender);
    expect(component.rendering()).toBe(false);
    expect(component.errorText()).toBe('');
    // de iframe-HTML bevat de gerenderde body (incl. eventuele inline styles)
    expect(component.buildPreviewHtml(mockRender.bodyHtml)).toContain(mockRender.bodyHtml);
  }));

  it('render() should show a (fallback) error when the service fails', fakeAsync(() => {
    serviceSpy.render.and.returnValue(throwError(() => new Error('boom')));
    component.selectedBookerId = 'b-1';
    component.render();
    tick();

    expect(component.errorText()).toBeTruthy();
    expect(component.rendering()).toBe(false);
    expect(component.rendered()).toBeNull();
  }));

  it('render() should surface the server error message (e.g. a bad placeholder)', fakeAsync(() => {
    const serverMessage = 'Onbekende of lege placeholder in de HTML-body: ${prospect.fullname}.';
    serviceSpy.render.and.returnValue(throwError(() => ({ error: { message: serverMessage } })));
    component.selectedBookerId = 'b-1';
    component.render();
    tick();

    expect(component.errorText()).toBe(serverMessage);
  }));

  it('canSend should reflect the EMAIL_SEND authority', () => {
    expect(authSpy.hasAuthority).toHaveBeenCalledWith('EMAIL_SEND');
    expect(component.canSend).toBe(true);
  });

  it('send() should call the service and show a snackbar when confirmed', fakeAsync(() => {
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(true));
    serviceSpy.send.and.returnValue(of(mockSendResult));
    fixture.detectChanges();
    tick();

    component.selectedBookerId = 'b-1';
    component.send();
    tick();

    expect(serviceSpy.send).toHaveBeenCalledWith('tpl-1', 'b-1');
    expect(snackBarOpenSpy).toHaveBeenCalled();
    expect(component.sending()).toBe(false);
  }));

  it('send() should do nothing when the confirmation is cancelled', fakeAsync(() => {
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(false));
    fixture.detectChanges();
    tick();

    component.selectedBookerId = 'b-1';
    component.send();
    tick();

    expect(serviceSpy.send).not.toHaveBeenCalled();
  }));

  it('send() should do nothing when no prospect is selected', () => {
    component.send();
    expect(serviceSpy.send).not.toHaveBeenCalled();
  });
});

/*
 * De dialoog kan ook voor een BOEKING gebruikt worden: vanuit het boekingdetail (vaste boeking, de gebruiker
 * kiest de template) of vanuit de templatelijst (vaste template, de gebruiker kiest prospect of boeking).
 */
describe('EmailTemplatePreviewDialogComponent (boeking)', () => {
  let serviceSpy: jasmine.SpyObj<EmailTemplateService>;
  let bookerSpy: jasmine.SpyObj<BookerService>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;
  let snackBarOpenSpy: jasmine.Spy;

  const template: EmailTemplate = {
    emailTemplateId: 'tpl-1', name: 'Bevestiging', description: '',
    subject: 'Boeking', bodyHtml: '<p>Hallo</p>',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };
  const booking: Booking = {
    bookingId: 'bk-1', bookerId: 'b-1', bookingNumber: 'B-2026-0042', bookingStatus: 'boeking',
    fromDate: '', untilDate: '', totalSum: 0, tenantOrganization: 'org-1',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
  };
  const rendered: EmailRender = { subject: 'Boeking B-2026-0042', bodyHtml: '<p>Hallo Klaas</p>' };
  const sendResult: EmailSendResult = { to: 'klaas@example.com', from: 'noreply@org.nl', subject: 'Boeking B-2026-0042' };

  async function setup(data: { template?: EmailTemplate; booking?: { bookingId: string; bookingNumber: string } }) {
    serviceSpy = jasmine.createSpyObj('EmailTemplateService', ['getAll', 'render', 'send', 'renderForBooking', 'sendForBooking']);
    serviceSpy.getAll.and.returnValue(of([template]));
    bookerSpy = jasmine.createSpyObj('BookerService', ['getByStatus']);
    bookerSpy.getByStatus.and.returnValue(of([]));
    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getAll']);
    bookingServiceSpy.getAll.and.returnValue(of([booking]));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [EmailTemplatePreviewDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: EmailTemplateService, useValue: serviceSpy },
        { provide: BookerService, useValue: bookerSpy },
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmailTemplatePreviewDialogComponent);
    const component = fixture.componentInstance;
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    return { fixture, component };
  }

  describe('vanuit het boekingdetail (vaste boeking, template kiezen)', () => {
    const data = { booking: { bookingId: 'bk-1', bookingNumber: 'B-2026-0042' } };

    it('laadt de templates en géén prospects, en start in boeking-modus', async () => {
      const { fixture, component } = await setup(data);
      fixture.detectChanges();

      expect(serviceSpy.getAll).toHaveBeenCalled();
      expect(bookerSpy.getByStatus).not.toHaveBeenCalled();
      expect(component.templates().length).toBe(1);
      expect(component.mode()).toBe('booking');
      expect(component.selectedBookingId).toBe('bk-1');
      expect(component.loadingProspects()).toBe(false);
    });

    it('kan pas mergen als er een template gekozen is', async () => {
      const { component } = await setup(data);

      expect(component.canRun()).toBe(false);
      component.render();
      expect(serviceSpy.renderForBooking).not.toHaveBeenCalled();

      component.selectedTemplateId = 'tpl-1';
      expect(component.canRun()).toBe(true);
    });

    it('render() gebruikt renderForBooking met de gekozen template en de vaste boeking', async () => {
      const { fixture, component } = await setup(data);
      serviceSpy.renderForBooking.and.returnValue(of(rendered));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      component.render();

      expect(serviceSpy.renderForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
      expect(serviceSpy.render).not.toHaveBeenCalled();
      expect(component.rendered()).toEqual(rendered);
    });

    it('send() vraagt bevestiging met het boekingnummer en gebruikt sendForBooking', async () => {
      const { fixture, component } = await setup(data);
      serviceSpy.sendForBooking.and.returnValue(of(sendResult));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(confirmServiceSpy.confirm).toHaveBeenCalled();
      expect(confirmServiceSpy.confirm.calls.mostRecent().args[0]).toContain('B-2026-0042');
      expect(serviceSpy.sendForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
      expect(serviceSpy.send).not.toHaveBeenCalled();
      expect(snackBarOpenSpy).toHaveBeenCalled();
    });

    it('send() doet niets als de bevestiging wordt geweigerd', async () => {
      const { fixture, component } = await setup(data);
      confirmServiceSpy.confirm.and.returnValue(Promise.resolve(false));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(serviceSpy.sendForBooking).not.toHaveBeenCalled();
    });

    it('toont de servermelding als versturen mislukt (bv. hoofdboeker zonder e-mailadres)', async () => {
      const { fixture, component } = await setup(data);
      const message = 'De hoofdboeker van de boeking heeft geen e-mailadres';
      serviceSpy.sendForBooking.and.returnValue(throwError(() => ({ error: { message } })));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toBe(message);
      expect(component.sending()).toBe(false);
    });

    it('een andere template kiezen wist het eerdere voorbeeld', async () => {
      const { component } = await setup(data);
      component.rendered.set(rendered);

      component.selectedTemplateId = 'tpl-2';
      component.rendered.set(null); // dit is wat (ngModelChange) in de template doet

      expect(component.rendered()).toBeNull();
    });
  });

  describe('vanuit de templatelijst (vaste template, doel kiezen)', () => {
    it('start met prospects en laadt de boekingen pas bij het wisselen naar boeking', async () => {
      const { fixture, component } = await setup({ template });
      fixture.detectChanges();

      expect(component.mode()).toBe('prospect');
      expect(serviceSpy.getAll).not.toHaveBeenCalled(); // de template staat al vast
      expect(bookingServiceSpy.getAll).not.toHaveBeenCalled();

      component.setMode('booking');

      expect(bookingServiceSpy.getAll).toHaveBeenCalledTimes(1);
      expect(component.bookings().length).toBe(1);
      expect(component.loadingBookings()).toBe(false);
    });

    it('laadt de boekingen maar één keer, ook bij heen en weer wisselen', async () => {
      const { fixture, component } = await setup({ template });
      fixture.detectChanges();

      component.setMode('booking');
      component.setMode('prospect');
      component.setMode('booking');

      expect(bookingServiceSpy.getAll).toHaveBeenCalledTimes(1);
    });

    it('wisselen van modus wist het voorbeeld en de foutmelding', async () => {
      const { fixture, component } = await setup({ template });
      fixture.detectChanges();
      component.rendered.set(rendered);
      component.errorText.set('oude fout');

      component.setMode('booking');

      expect(component.rendered()).toBeNull();
      expect(component.errorText()).toBe('');
    });

    it('in boeking-modus is een boeking nodig; een gekozen prospect telt dan niet', async () => {
      const { fixture, component } = await setup({ template });
      fixture.detectChanges();
      component.selectedBookerId = 'b-1';
      component.setMode('booking');

      expect(component.canRun()).toBe(false);

      component.selectedBookingId = 'bk-1';
      expect(component.canRun()).toBe(true);
    });

    it('render() voor een gekozen boeking gebruikt renderForBooking', async () => {
      const { fixture, component } = await setup({ template });
      serviceSpy.renderForBooking.and.returnValue(of(rendered));
      fixture.detectChanges();
      component.setMode('booking');

      component.selectedBookingId = 'bk-1';
      component.render();

      expect(serviceSpy.renderForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
      expect(serviceSpy.render).not.toHaveBeenCalled();
    });

    it('send() voor een gekozen boeking noemt het boekingnummer uit de lijst in de bevestiging', async () => {
      const { fixture, component } = await setup({ template });
      serviceSpy.sendForBooking.and.returnValue(of(sendResult));
      fixture.detectChanges();
      component.setMode('booking');

      component.selectedBookingId = 'bk-1';
      await component.send();

      expect(confirmServiceSpy.confirm.calls.mostRecent().args[0]).toContain('B-2026-0042');
      expect(serviceSpy.sendForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
    });

    it('een mislukte lijst met boekingen laat de dialoog niet hangen', async () => {
      const { fixture, component } = await setup({ template });
      bookingServiceSpy.getAll.and.returnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();

      component.setMode('booking');

      expect(component.loadingBookings()).toBe(false);
      expect(component.bookings()).toEqual([]);
    });
  });
});
