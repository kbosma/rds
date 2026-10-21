import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { BookingMessagesCardComponent } from './booking-messages-card.component';
import { Document, MolliePayment, SentEmail } from '../../shared/models';

describe('BookingMessagesCardComponent', () => {
  const email = { sentEmailId: 'e-1', subject: 'Betaalverzoek', toAddress: 'thomas@example.com', createdAt: '2026-10-12T14:05:00', createdByName: 'Pieter', resentFromId: null } as SentEmail;
  const doc = { documentId: 'd-1', displayname: 'Bevestiging.pdf', mimeType: 'application/pdf', createdAt: '2026-10-10T09:00:00', visibleInPortal: true } as Document;
  const hiddenDoc = { documentId: 'd-2', displayname: 'Intern.pdf', mimeType: 'application/pdf', createdAt: '2026-10-09T09:00:00', visibleInPortal: false } as Document;
  const payment = { molliePaymentId: 'p-1', amount: 1650, description: 'Betaling BK-4', method: 'ideal', createdAt: '2026-10-19T14:00:00' } as MolliePayment;

  async function setup(inputs: Record<string, unknown> = {}) {
    await TestBed.configureTestingModule({
      imports: [BookingMessagesCardComponent, NoopAnimationsModule],
      providers: [provideTranslateService()],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingMessagesCardComponent);
    fixture.componentRef.setInput('emails', [email]);
    fixture.componentRef.setInput('documents', [doc]);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.componentRef.setInput('paymentStatus', { 'p-1': 'open' });
    fixture.componentRef.setInput('canReadEmail', true);
    fixture.componentRef.setInput('canReadDocument', true);
    fixture.componentRef.setInput('canReadPayment', true);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('.timeline-row')) as HTMLElement[];

  it('geeft de regels dezelfde om-en-om tint als de tabellen', async () => {
    const { el } = await setup();
    const [first, second, third] = rows(el);

    expect(el.querySelector('ul.timeline')?.classList).toContain('zebra-rows');
    expect(getComputedStyle(first).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(second).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(third).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('toont alle soorten in één lijst met een pictogram per soort', async () => {
    const { el } = await setup();

    expect(rows(el).map((r) => r.dataset['kind'])).toEqual(['payment', 'email', 'document']);
    expect(rows(el).map((r) => r.querySelector('.kind-icon mat-icon')?.textContent?.trim())).toEqual(['credit_card', 'mail', 'description']);
  });

  it('toont het soort-pictogram zonder eigen achtergrond, zodat de regeltint erdoorheen blijft', async () => {
    const { el } = await setup();

    for (const icon of Array.from(el.querySelectorAll('.kind-icon'))) {
      expect(getComputedStyle(icon).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    }
  });

  it('toont per soort de eigenschappen als vlakjes', async () => {
    const { el } = await setup();
    const [paymentRow, emailRow, documentRow] = rows(el);

    expect(paymentRow.querySelector('app-payment-status-badge')).not.toBeNull();
    expect(paymentRow.querySelector('.pill-neutral')?.textContent).toContain('ideal');
    expect(emailRow.querySelector('.pill-ok')).not.toBeNull();
    expect(documentRow.textContent).toContain('PDF');
  });

  it('filtert op soort', async () => {
    const { el, component, fixture } = await setup();

    component.filter.set('email');
    fixture.detectChanges();

    expect(rows(el).length).toBe(1);
    expect(rows(el)[0].dataset['kind']).toBe('email');
  });

  it('toont een lege tekst zonder items', async () => {
    const { el } = await setup({ emails: [], documents: [], payments: [] });

    expect(rows(el).length).toBe(0);
    expect(el.querySelector('.empty-text')).not.toBeNull();
  });

  it('toont de Toevoegen-knop alleen met e-mail- of documentrecht', async () => {
    expect((await setup()).el.querySelector('.new-btn')).toBeNull();
    TestBed.resetTestingModule();
    const { el } = await setup({ canSendEmail: true });
    expect(el.querySelector('.new-btn')).not.toBeNull();
    expect(el.querySelector('.new-btn')?.classList).toContain('act-create');
  });

  it('meldt een klik op inzien met de betreffende regel', async () => {
    const { component, el, fixture } = await setup();
    const seen: string[] = [];
    component.view.subscribe((i) => seen.push(i.kind + ':' + i.id));

    (rows(el)[1].querySelector('button[aria-label], button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(seen).toEqual(['email:e-1']);
  });

  it('biedt nooit verwijderen aan: documenten, betalingen en e-mails zijn geschiedenis', async () => {
    const { el } = await setup({ canEditDocument: true });

    expect(el.querySelector('.action-delete')).toBeNull();
  });

  it('toont of een document in het portaal zichtbaar is of alleen intern', async () => {
    const { el } = await setup({ documents: [doc, hiddenDoc] });
    const documentRows = rows(el).filter((r) => r.dataset['kind'] === 'document');

    expect(documentRows[0].querySelector('.pill-ok')).not.toBeNull();
    expect(documentRows[1].querySelector('.pill-ok')).toBeNull();
  });

  it('biedt wijzigen alleen bij een document en alleen met het recht', async () => {
    const withRight = await setup({ canEditDocument: true });
    const buttonCount = (row: HTMLElement) => row.querySelectorAll('button').length;
    const [paymentRow, emailRow, documentRow] = rows(withRight.el);

    expect(buttonCount(documentRow)).toBe(buttonCount(emailRow) + 1);
    expect(buttonCount(paymentRow)).toBe(buttonCount(emailRow));
  });
});
