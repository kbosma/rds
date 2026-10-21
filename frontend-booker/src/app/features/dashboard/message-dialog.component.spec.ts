import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { PortalService } from '../../core/portal/portal.service';
import { MESSAGES, MESSAGE_CONTENT, portalServiceSpy } from '../../testing/portal-fixtures';
import { PortalMessageContent } from '../../shared/models/portal.models';
import { MessageDialogComponent } from './message-dialog.component';

describe('MessageDialogComponent', () => {
  function setup(service = portalServiceSpy()) {
    TestBed.configureTestingModule({
      imports: [MessageDialogComponent],
      providers: [{ provide: PortalService, useValue: service }, { provide: MAT_DIALOG_DATA, useValue: MESSAGES[0] }],
    });
    const fixture = TestBed.createComponent(MessageDialogComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, service };
  }
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');

  it('toont onderwerp, afzender en tijdstip en haalt de inhoud op', () => {
    const { el, service } = setup();

    expect(el.querySelector('h2')?.textContent).toContain('Bevestiging van uw boeking');
    expect(text(el.querySelector('.meta'))).toContain('noreply@puurkroatie.nl');
    expect(text(el.querySelector('.meta'))).toContain('12 oktober 2026, 10:20');
    expect(service.getMessage).toHaveBeenCalledWith('m1');
  });

  it('toont de mail in een iframe zonder scripts en zonder eigen herkomst', () => {
    const { el } = setup();
    const frame = el.querySelector('iframe') as HTMLIFrameElement;

    expect(frame).not.toBeNull();
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(frame.getAttribute('title')).toBe('Bevestiging van uw boeking');
  });

  it('toont tijdens het laden een indicator in plaats van de mail', () => {
    const pending = new Subject<PortalMessageContent>();
    const service = portalServiceSpy();
    service.getMessage.and.returnValue(pending);
    const { fixture, el } = setup(service);

    expect(el.querySelector('mat-spinner')).not.toBeNull();
    expect(el.querySelector('iframe')).toBeNull();

    pending.next(MESSAGE_CONTENT);
    fixture.detectChanges();

    expect(el.querySelector('iframe')).not.toBeNull();
  });

  it('toont een fout met opnieuw proberen als de mail niet geladen kan worden', () => {
    const service = portalServiceSpy();
    service.getMessage.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = setup(service);

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('kon niet worden geladen');
    expect(el.querySelector('iframe')).toBeNull();

    service.getMessage.and.returnValue(of(MESSAGE_CONTENT));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('iframe')).not.toBeNull();
  });

  it('heeft een knop om te sluiten', () => {
    const { el } = setup();

    expect(text(el.querySelector('mat-dialog-actions'))).toContain('Sluiten');
  });
});
