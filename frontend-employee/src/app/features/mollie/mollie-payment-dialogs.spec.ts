import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { MolliePaymentViewDialogComponent } from './mollie-payment-view-dialog.component';
import { MolliePaymentEditDialogComponent } from './mollie-payment-edit-dialog.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry, PaymentRelink } from '../../shared/models';

describe('Betalingsdialogen', () => {
  const payment: MolliePayment = {
    molliePaymentId: 'p-1', molliePaymentExternalId: '', method: null, amount: 70, currency: 'EUR',
    description: 'Voorschot', checkoutUrl: '', createdAt: '2026-05-01T10:00:00', createdBy: 'u',
    modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
  };

  describe('MolliePaymentViewDialogComponent', () => {
    const entries: MolliePaymentStatusEntry[] = [
      { molliePaymentStatusEntryId: 'e-1', molliePaymentId: 'p-1', status: 'open', createdAt: '2026-05-01T10:00:00', createdBy: null, modifiedAt: null, modifiedBy: null },
      { molliePaymentStatusEntryId: 'e-2', molliePaymentId: 'p-1', status: 'paid', createdAt: '2026-05-02T10:00:00', createdBy: 'u', modifiedAt: null, modifiedBy: null },
    ];

    async function setup(
      result$: ReturnType<MolliePaymentService['getStatusEntries']>,
      canCorrect?: boolean,
      extra: { canRelink?: boolean; currentBookingId?: string; relinks?: PaymentRelink[] } = {},
    ) {
      const service = jasmine.createSpyObj('MolliePaymentService', ['getStatusEntries', 'getRelinks']);
      service.getStatusEntries.and.returnValue(result$);
      service.getRelinks.and.returnValue(of(extra.relinks ?? []));
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
      await TestBed.configureTestingModule({
        imports: [MolliePaymentViewDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MolliePaymentService, useValue: service },
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { payment, bookingNumber: 'BK-1', canCorrect, canRelink: extra.canRelink, currentBookingId: extra.currentBookingId } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(MolliePaymentViewDialogComponent);
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance, service, dialogRef };
    }

    const relink: PaymentRelink = {
      relinkId: 'r-1', molliePaymentId: 'p-1', fromBookingId: 'b-1', fromBookingNumber: 'BK-1', toBookingId: 'b-2', toBookingNumber: 'BK-2',
      reason: 'Verkeerde boeking', createdAt: '2026-05-03T10:00:00', createdBy: 'acc-1', createdByName: 'Pieter de Groot',
    };

    it('toont de geregistreerde herkoppelingen met boekingnummers, naam en reden', async () => {
      const { fixture } = await setup(of(entries), false, { relinks: [relink] });
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.relinks tbody tr') as HTMLElement;
      const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim());
      expect(cells[0]).toBe('BK-1');
      expect(cells[1]).toBe('BK-2');
      expect(cells[3]).toBe('Pieter de Groot');
      expect(cells[4]).toBe('Verkeerde boeking');
    });

    it('toont geen herkoppel-tabel zonder herkoppelingen', async () => {
      const { fixture } = await setup(of(entries));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.relinks')).toBeNull();
    });

    it('toont de knop "Naar andere boeking koppelen" alleen met canRelink én de huidige boeking', async () => {
      const allowed = await setup(of(entries), false, { canRelink: true, currentBookingId: 'b-1' });
      allowed.fixture.detectChanges();
      expect(allowed.fixture.nativeElement.querySelector('.relink-btn')).not.toBeNull();
      expect(allowed.fixture.nativeElement.querySelector('.relink-btn').classList).toContain('act-update');
    });

    it('verbergt de herkoppelknop zonder canRelink', async () => {
      const { fixture } = await setup(of(entries), false, { canRelink: false, currentBookingId: 'b-1' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.relink-btn')).toBeNull();
    });

    it('verbergt de herkoppelknop als de huidige boeking niet bekend is', async () => {
      const { fixture } = await setup(of(entries), false, { canRelink: true });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.relink-btn')).toBeNull();
    });

    it('sluit met true na een herkoppeling (de betaling hangt dan niet meer aan deze boeking)', async () => {
      const { component, dialogRef } = await setup(of(entries), false, { canRelink: true, currentBookingId: 'b-1' });
      spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

      component.openRelink();

      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('laat het dialoog open als het herkoppelen wordt geannuleerd', async () => {
      const { component, dialogRef } = await setup(of(entries), false, { canRelink: true, currentBookingId: 'b-1' });
      spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.openRelink();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('toont de gegevens, het boekingnummer en de volledige statushistorie', async () => {
      const { fixture, service } = await setup(of(entries));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(service.getStatusEntries).toHaveBeenCalledWith('p-1');
      expect(text).toContain('BK-1');
      expect(text).toContain('Voorschot');
      expect(fixture.nativeElement.querySelectorAll('.history tbody tr').length).toBe(2);
    });

    it('toont bij "Door" een leesbare naam, "Systeem" voor Mollie en "Onbekend" zonder bekende naam', async () => {
      const named: MolliePaymentStatusEntry[] = [
        { ...entries[0], molliePaymentStatusEntryId: 'e-a', createdBy: 'acc-1', createdByName: 'Maria Jansen' },
        { ...entries[0], molliePaymentStatusEntryId: 'e-b', createdBy: null, createdByName: null },
        { ...entries[0], molliePaymentStatusEntryId: 'e-c', createdBy: 'verwijderd-account', createdByName: null },
      ];
      const { fixture } = await setup(of(named));
      fixture.detectChanges();

      const door = Array.from(fixture.nativeElement.querySelectorAll('.history tbody tr'))
        .map((tr) => ((tr as HTMLElement).querySelectorAll('td')[2] as HTMLElement).textContent?.trim());
      expect(door).toEqual(['Maria Jansen', 'Systeem', 'Onbekend']);
      expect(fixture.nativeElement.textContent).not.toContain('acc-1'); // nooit het id tonen
    });

    it('een lege historie of een fout laat het dialoog gewoon openen', async () => {
      const { component } = await setup(throwError(() => new Error('nee')));

      expect(component.loading()).toBe(false);
      expect(component.entries()).toEqual([]);
    });

    it('markeert een correctie en toont de reden, bij gewone regels blijft de reden leeg', async () => {
      const withCorrection: MolliePaymentStatusEntry[] = [
        entries[0],
        { ...entries[1], molliePaymentStatusEntryId: 'e-c', status: 'paid', correction: true, reason: 'Betaald per bank', createdByName: 'Pieter de Groot', createdBy: 'acc-2' },
      ];
      const { fixture } = await setup(of(withCorrection));
      fixture.detectChanges();

      const rows = Array.from(fixture.nativeElement.querySelectorAll('.history tbody tr')) as HTMLElement[];
      expect(rows[0].querySelector('.correction-tag')).toBeNull();
      expect(rows[1].querySelector('.correction-tag')?.textContent?.trim()).toBe('Correctie');
      expect(rows[1].querySelector('.reason')?.textContent?.trim()).toBe('Betaald per bank');
      expect(rows[0].querySelector('.reason')?.textContent?.trim()).toBe('');
    });

    it('verbergt de knop "Correctie registreren" zonder canCorrect', async () => {
      const { fixture } = await setup(of(entries), false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.correct-btn')).toBeNull();
    });

    it('toont de knop "Correctie registreren" met canCorrect', async () => {
      const { fixture } = await setup(of(entries), true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.correct-btn')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.correct-btn').classList).toContain('act-update');
    });

    it('bevat geen enkele knop om iets te wijzigen', async () => {
      const { fixture } = await setup(of(entries));

      const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLElement).textContent?.trim());
      expect(labels.length).toBe(1); // alleen "Sluiten"
    });
  });

  describe('MolliePaymentEditDialogComponent', () => {
    async function setup() {
      const service = jasmine.createSpyObj('MolliePaymentService', ['update']);
      service.update.and.returnValue(of(payment));
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
      await TestBed.configureTestingModule({
        imports: [MolliePaymentEditDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MolliePaymentService, useValue: service },
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { payment } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(MolliePaymentEditDialogComponent);
      const component = fixture.componentInstance;
      const snack = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
      fixture.detectChanges();
      return { component, service, dialogRef, snack };
    }

    it('is voorgevuld en stuurt de volledige betaling met nieuwe omschrijving en bedrag', async () => {
      const { component, service, dialogRef } = await setup();
      expect(component.form.getRawValue()).toEqual({ description: 'Voorschot', amount: 70 });

      component.form.setValue({ description: 'Restant', amount: 99.5 });
      component.save();

      expect(service.update).toHaveBeenCalledOnceWith('p-1', { ...payment, description: 'Restant', amount: 99.5 });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('toont een eigen melding als de betaling inmiddels bij Mollie bestaat (409)', async () => {
      const { component, service, dialogRef, snack } = await setup();
      service.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      component.form.setValue({ description: 'Restant', amount: 99.5 });

      component.save();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(snack.calls.mostRecent().args[0]).toBe('Deze betaling bestaat al bij Mollie en kan niet meer worden gewijzigd.');
      expect(component.saving()).toBeFalse();
    });

    it('weigert een leeg of niet-positief bedrag', async () => {
      const { component, service } = await setup();

      component.form.setValue({ description: 'x', amount: 0 });
      component.save();
      component.form.setValue({ description: '', amount: 10 });
      component.save();

      expect(service.update).not.toHaveBeenCalled();
    });

    it('een mislukte opslag meldt de fout en sluit niet', async () => {
      const { component, service, dialogRef, snack } = await setup();
      service.update.and.returnValue(throwError(() => new Error('boom')));

      component.save();

      expect(snack).toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    });
  });
});
