import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { SentEmailViewDialogComponent } from './sent-email-view-dialog.component';
import { SentEmailService } from './sent-email.service';
import { SentEmail } from '../../shared/models';

describe('SentEmailViewDialogComponent', () => {
  const email = {
    sentEmailId: 'e-1', bookingId: 'b-1', fromAddress: 'noreply@x.nl', toAddress: 'thomas@example.com', subject: 'Betaalverzoek',
    bodyHtml: '<p>Hoi</p>', resentFromId: null, createdAt: '2026-10-12T14:05:00', createdBy: 'a-1', createdByName: 'Pieter de Groot',
  } as SentEmail;

  async function setup(canResend = true) {
    const service = jasmine.createSpyObj<SentEmailService>('SentEmailService', ['resend']);
    service.resend.and.returnValue(of(email));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [SentEmailViewDialogComponent, NoopAnimationsModule],
      providers: [
        provideTranslateService(),
        { provide: SentEmailService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { email, canResend } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SentEmailViewDialogComponent);
    spyOn((fixture.componentInstance as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, service, dialogRef, el: fixture.nativeElement as HTMLElement };
  }

  it('toont onderwerp, adressen, afzendernaam en de bewaarde inhoud in een sandbox-iframe', async () => {
    const { el } = await setup();

    expect(el.textContent).toContain('Betaalverzoek');
    expect(el.textContent).toContain('thomas@example.com');
    expect(el.textContent).toContain('Pieter de Groot');
    const frame = el.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
  });

  it('verbergt opnieuw versturen zonder EMAIL_SEND', async () => {
    const { el } = await setup(false);

    expect(el.querySelector('.resend-btn')).toBeNull();
  });

  it('verstuurt opnieuw en sluit met true', async () => {
    const { component, service, dialogRef } = await setup();

    component.resend();

    expect(service.resend).toHaveBeenCalledOnceWith('e-1');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('twee keer kort na elkaar opnieuw versturen verstuurt maar één mail', async () => {
    const { component, service } = await setup();
    service.resend.and.returnValue(new Subject<SentEmail>());

    component.resend();
    component.resend();

    expect(service.resend).toHaveBeenCalledTimes(1);
  });

  it('na een fout kan opnieuw geprobeerd worden', async () => {
    const { component, service, dialogRef } = await setup();
    service.resend.and.returnValues(throwError(() => new Error('smtp')), of(email));

    component.resend();
    expect(component.sending()).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
    component.resend();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
