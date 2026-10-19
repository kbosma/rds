import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import {
  EmailTemplatePreviewDialogComponent,
  EmailTemplatePreviewDialogData,
} from './email-template-preview-dialog.component';
import { EmailTemplateService } from './email-template.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplate, EmailRender, EmailSendResult } from '../../shared/models';

/*
 * E-mail versturen kan alleen vanuit een boeking of een prospect: het doel staat dus altijd vast en de
 * gebruiker kiest alleen de template. We mocken EmailTemplateService, AuthService en ConfirmService.
 */
describe('EmailTemplatePreviewDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<EmailTemplateService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;
  let snackBarOpenSpy: jasmine.Spy;

  const template: EmailTemplate = {
    emailTemplateId: 'tpl-1', name: 'Bevestiging', description: '',
    subject: 'Boeking', bodyHtml: '<p>Hallo</p>',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };
  const rendered: EmailRender = { subject: 'Welkom Klaas', bodyHtml: '<p>Hallo Klaas</p>' };
  const sendResult: EmailSendResult = { to: 'klaas@example.com', from: 'noreply@org.nl', subject: 'Welkom Klaas' };

  const bookingData: EmailTemplatePreviewDialogData = { booking: { bookingId: 'bk-1', bookingNumber: 'B-2026-0042' } };
  const prospectData: EmailTemplatePreviewDialogData = { booker: { bookerId: 'b-1', name: 'Klaas van Houten' } };

  async function setup(data: EmailTemplatePreviewDialogData, canSend = true) {
    serviceSpy = jasmine.createSpyObj('EmailTemplateService', ['getAll', 'render', 'send', 'renderForBooking', 'sendForBooking']);
    serviceSpy.getAll.and.returnValue(of([template]));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.callFake((a: string) => a === 'EMAIL_SEND' ? canSend : true);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [EmailTemplatePreviewDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: EmailTemplateService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmailTemplatePreviewDialogComponent);
    const component = fixture.componentInstance;
    // MatSnackBar zit in MatSnackBarModule, dus de component heeft een eigen instance.
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    return { fixture, component };
  }

  describe('vanuit het boekingdetail (vaste boeking)', () => {
    it('laadt de templates en toont de boeking als vast doel', async () => {
      const { fixture, component } = await setup(bookingData);
      fixture.detectChanges();

      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
      expect(component.templates().length).toBe(1);
      expect(component.loadingTemplates()).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('.fixed-target')?.textContent).toContain('B-2026-0042');
    });

    it('kan pas mergen als er een template gekozen is', async () => {
      const { fixture, component } = await setup(bookingData);
      fixture.detectChanges();

      expect(component.canRun()).toBe(false);
      component.render();
      expect(serviceSpy.renderForBooking).not.toHaveBeenCalled();

      component.selectedTemplateId = 'tpl-1';
      expect(component.canRun()).toBe(true);
    });

    it('render() gebruikt renderForBooking met de gekozen template en de vaste boeking', async () => {
      const { fixture, component } = await setup(bookingData);
      serviceSpy.renderForBooking.and.returnValue(of(rendered));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      component.render();

      expect(serviceSpy.renderForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
      expect(serviceSpy.render).not.toHaveBeenCalled();
      expect(component.rendered()).toEqual(rendered);
      expect(component.rendering()).toBe(false);
      expect(component.errorText()).toBe('');
      // de iframe-HTML bevat de gerenderde body (incl. eventuele inline styles)
      expect(component.buildPreviewHtml(rendered.bodyHtml)).toContain(rendered.bodyHtml);
    });

    it('send() vraagt bevestiging met het boekingnummer en gebruikt sendForBooking', async () => {
      const { fixture, component } = await setup(bookingData);
      serviceSpy.sendForBooking.and.returnValue(of(sendResult));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(confirmServiceSpy.confirm.calls.mostRecent().args[0]).toContain('B-2026-0042');
      expect(serviceSpy.sendForBooking).toHaveBeenCalledWith('tpl-1', 'bk-1');
      expect(serviceSpy.send).not.toHaveBeenCalled();
      expect(snackBarOpenSpy).toHaveBeenCalled();
      expect(component.sending()).toBe(false);
    });
  });

  describe('vanuit de prospectenlijst (vaste prospect)', () => {
    it('toont de prospect als vast doel', async () => {
      const { fixture } = await setup(prospectData);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('.fixed-target')?.textContent).toContain('Klaas van Houten');
    });

    it('render() gebruikt render met de gekozen template en de vaste prospect', async () => {
      const { fixture, component } = await setup(prospectData);
      serviceSpy.render.and.returnValue(of(rendered));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      component.render();

      expect(serviceSpy.render).toHaveBeenCalledWith('tpl-1', 'b-1');
      expect(serviceSpy.renderForBooking).not.toHaveBeenCalled();
      expect(component.rendered()).toEqual(rendered);
    });

    it('send() vraagt bevestiging met de naam en gebruikt send', async () => {
      const { fixture, component } = await setup(prospectData);
      serviceSpy.send.and.returnValue(of(sendResult));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(confirmServiceSpy.confirm.calls.mostRecent().args[0]).toContain('Klaas van Houten');
      expect(serviceSpy.send).toHaveBeenCalledWith('tpl-1', 'b-1');
      expect(serviceSpy.sendForBooking).not.toHaveBeenCalled();
    });
  });

  describe('gedeeld gedrag', () => {
    it('render() toont een terugvaltekst als de service faalt zonder melding', async () => {
      const { fixture, component } = await setup(prospectData);
      serviceSpy.render.and.returnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      component.render();

      expect(component.rendering()).toBe(false);
      expect(component.rendered()).toBeNull();
      expect(component.errorText()).not.toBe('');
    });

    it('render() toont de servermelding (bv. een onbekende placeholder)', async () => {
      const { fixture, component } = await setup(prospectData);
      const message = 'Onbekende of lege placeholder: ${booking}';
      serviceSpy.render.and.returnValue(throwError(() => ({ error: { message } })));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      component.render();

      expect(component.errorText()).toBe(message);
    });

    it('send() doet niets als de bevestiging wordt geweigerd', async () => {
      const { fixture, component } = await setup(bookingData);
      confirmServiceSpy.confirm.and.returnValue(Promise.resolve(false));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(serviceSpy.sendForBooking).not.toHaveBeenCalled();
    });

    it('send() doet niets zolang er geen template gekozen is', async () => {
      const { fixture, component } = await setup(prospectData);
      fixture.detectChanges();

      await component.send();

      expect(confirmServiceSpy.confirm).not.toHaveBeenCalled();
      expect(serviceSpy.send).not.toHaveBeenCalled();
    });

    it('toont de servermelding als versturen mislukt (bv. hoofdboeker zonder e-mailadres)', async () => {
      const { fixture, component } = await setup(bookingData);
      const message = 'De hoofdboeker van de boeking heeft geen e-mailadres';
      serviceSpy.sendForBooking.and.returnValue(throwError(() => ({ error: { message } })));
      fixture.detectChanges();

      component.selectedTemplateId = 'tpl-1';
      await component.send();

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toBe(message);
      expect(component.sending()).toBe(false);
    });

    it('een andere template kiezen wist het eerdere voorbeeld', async () => {
      const { component } = await setup(bookingData);
      component.rendered.set(rendered);

      component.selectedTemplateId = 'tpl-2';
      component.rendered.set(null); // dit is wat (ngModelChange) in de template doet

      expect(component.rendered()).toBeNull();
    });

    it('canSend volgt de authority EMAIL_SEND en verbergt anders de verstuurknop', async () => {
      const { fixture, component } = await setup(bookingData, false);
      fixture.detectChanges();

      expect(component.canSend).toBe(false);
      expect(authSpy.hasAuthority).toHaveBeenCalledWith('EMAIL_SEND');
      expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
        .some((b) => b.textContent?.includes('send'))).toBe(false);
    });
  });
});
