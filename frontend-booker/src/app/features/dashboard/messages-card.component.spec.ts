import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { MESSAGES, NOW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { MessageDialogComponent } from './message-dialog.component';
import { MessagesCardComponent } from './messages-card.component';

describe('MessagesCardComponent', () => {
  function setup(service = portalServiceSpy()) {
    const s = storeSetup(NOW, service);
    TestBed.configureTestingModule({ imports: [MessagesCardComponent], providers: s.providers });
    const store = TestBed.inject(PortalStore);
    store.init();
    const fixture = TestBed.createComponent(MessagesCardComponent);
    fixture.detectChanges();
    // MatDialogModule staat in de imports van het component, dus het component heeft een eigen MatDialog.
    const dialog = (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog;
    return { fixture, el: fixture.nativeElement as HTMLElement, store, dialog, ...s };
  }
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');
  const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('.row'));

  it('toont e-mails en documenten in één lijst, nieuwste eerst', () => {
    const { el } = setup();

    expect(el.querySelector('h2')?.textContent).toContain('Berichten en documenten');
    expect(rows(el).map((r) => r.getAttribute('data-kind'))).toEqual(['email', 'email', 'document', 'document', 'email']);
    expect(text(rows(el)[0])).toContain('Betaalverzoek restbedrag');
    expect(text(rows(el)[2])).toContain('Voucher.pdf');
  });

  it('toont bij een mail de datum en afzender, en markeert een opnieuw verstuurde mail', () => {
    const { el } = setup();

    expect(text(rows(el)[0])).toContain('18 okt 2026');
    expect(text(rows(el)[0])).toContain('noreply@puurkroatie.nl');
    expect(text(rows(el)[0])).toContain('opnieuw verstuurd');
    expect(text(rows(el)[1])).not.toContain('opnieuw verstuurd');
  });

  it('toont bij een document de datum en alleen een grootte als die bekend is', () => {
    const { el } = setup();

    expect(text(rows(el)[3])).toContain('12 okt 2026');
    expect(text(rows(el)[3])).toContain('180 kB');
    expect(text(rows(el)[2])).not.toContain('kB');
  });

  it('heeft een leesknop bij een mail en een downloadknop bij een document, met een naam voor schermlezers', () => {
    const { el } = setup();

    expect(rows(el)[0].querySelector('button.view')?.getAttribute('aria-label')).toBe('Betaalverzoek restbedrag lezen');
    expect(rows(el)[0].querySelector('button.download')).toBeNull();
    expect(rows(el)[2].querySelector('button.download')?.getAttribute('aria-label')).toBe('Voucher.pdf downloaden');
    expect(rows(el)[2].querySelector('button.view')).toBeNull();
  });

  it('kleurt lezen en downloaden als risicoloze acties (blauw)', () => {
    const { el } = setup();

    expect(rows(el)[0].querySelector('button.view')?.classList).toContain('act-info');
    expect(rows(el)[2].querySelector('button.download')?.classList).toContain('act-info');
  });

  it('geeft de regels de zachte om-en-om tint (zebra-rows) en de soort-iconen geen eigen achtergrond', () => {
    const { el } = setup();
    const background = (e: Element) => getComputedStyle(e).backgroundColor;
    const clear = 'rgba(0, 0, 0, 0)';

    expect(el.querySelector('ul.list')?.classList).toContain('zebra-rows');
    expect(rows(el).map((r) => background(r) === clear)).toEqual([true, false, true, false, true]);
    for (const icon of Array.from(el.querySelectorAll('.row .kind'))) {
      expect(background(icon)).toBe(clear);
    }
  });

  it('opent een mail in het berichtenvenster', () => {
    const { el, dialog } = setup();
    const open = spyOn(dialog, 'open');

    (rows(el)[1].querySelector('button.view') as HTMLButtonElement).click();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.calls.mostRecent().args[0]).toBe(MessageDialogComponent);
    expect((open.calls.mostRecent().args[1] as { data: unknown }).data).toEqual(MESSAGES[1]);
  });

  it('downloadt een document bij een klik', () => {
    const { fixture, el, service, saveFile } = setup();

    (rows(el)[3].querySelector('button.download') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.downloadDocument).toHaveBeenCalledWith('d1');
    expect(saveFile).toHaveBeenCalledWith(jasmine.any(Blob), 'Reisbevestiging.pdf');
  });

  it('meldt een fout als het downloaden mislukt', () => {
    const { fixture, el, service } = setup();
    service.downloadDocument.and.returnValue(throwError(() => new Error('boom')));

    (rows(el)[2].querySelector('button.download') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.err')?.textContent).toContain('kon niet worden gedownload');
  });

  it('heeft een filter met aantallen en toont daarna alleen die soort', () => {
    const { fixture, el } = setup();
    const chips = Array.from(el.querySelectorAll('.chip'));

    expect(chips.map((c) => text(c).trim())).toEqual(['Alles 5', 'E-mail 3', 'Documenten 2']);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');

    (chips[2] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(rows(el).length).toBe(2);
    expect(rows(el).every((r) => r.getAttribute('data-kind') === 'document')).toBeTrue();
    expect(el.querySelectorAll('.chip')[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('toont geen filter als er maar één soort is', () => {
    const service = portalServiceSpy();
    service.getMessages.and.returnValue(of([]));
    const { el } = setup(service);

    expect(el.querySelector('.filters')).toBeNull();
    expect(rows(el).length).toBe(2);
  });

  it('toont maximaal zes regels met een knop voor de rest, en weer minder na uitklappen', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...MESSAGES[0], messageId: `x${i}`, createdAt: `2026-11-0${i + 1}T10:00:00` }));
    const service = portalServiceSpy();
    service.getMessages.and.returnValue(of(many));
    const { fixture, el } = setup(service);

    expect(rows(el).length).toBe(6);
    expect(text(el.querySelector('.more'))).toContain('Toon nog 2');

    (el.querySelector('.more') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(rows(el).length).toBe(8);
    expect(text(el.querySelector('.more'))).toContain('Toon minder');

    (el.querySelector('.more') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(rows(el).length).toBe(6);
  });

  it('toont een lege toestand zonder berichten en documenten', () => {
    const service = portalServiceSpy();
    service.getMessages.and.returnValue(of([]));
    service.getDocuments.and.returnValue(of([]));
    const { el } = setup(service);

    expect(text(el)).toContain('nog geen berichten of documenten');
  });

  it('toont wat er is en een melding als één van de twee niet geladen kon worden', () => {
    const service = portalServiceSpy();
    service.getMessages.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = setup(service);

    expect(rows(el).length).toBe(2);
    expect(el.querySelector('.partial')?.textContent).toContain('Een deel kon niet worden geladen');

    service.getMessages.and.returnValue(of(MESSAGES));
    (el.querySelector('.partial button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(rows(el).length).toBe(5);
    expect(el.querySelector('.partial')).toBeNull();
  });

  it('toont een fout met opnieuw proberen als beide mislukken', () => {
    const service = portalServiceSpy();
    service.getMessages.and.returnValue(throwError(() => new Error('boom')));
    service.getDocuments.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = setup(service);

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    service.getMessages.and.returnValue(of(MESSAGES));
    service.getDocuments.and.returnValue(of([]));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(rows(el).length).toBe(3);
  });
});
