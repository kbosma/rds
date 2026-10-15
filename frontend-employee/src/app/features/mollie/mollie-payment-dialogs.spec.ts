import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { MolliePaymentViewDialogComponent } from './mollie-payment-view-dialog.component';
import { MolliePaymentEditDialogComponent } from './mollie-payment-edit-dialog.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';

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

    async function setup(result$: ReturnType<MolliePaymentService['getStatusEntries']>) {
      const service = jasmine.createSpyObj('MolliePaymentService', ['getStatusEntries']);
      service.getStatusEntries.and.returnValue(result$);
      await TestBed.configureTestingModule({
        imports: [MolliePaymentViewDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MolliePaymentService, useValue: service },
          { provide: MAT_DIALOG_DATA, useValue: { payment, bookingNumber: 'BK-1' } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(MolliePaymentViewDialogComponent);
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance, service };
    }

    it('toont de gegevens, het boekingnummer en de volledige statushistorie', async () => {
      const { fixture, service } = await setup(of(entries));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(service.getStatusEntries).toHaveBeenCalledWith('p-1');
      expect(text).toContain('BK-1');
      expect(text).toContain('Voorschot');
      expect(fixture.nativeElement.querySelectorAll('.history tbody tr').length).toBe(2);
    });

    it('een lege historie of een fout laat het dialoog gewoon openen', async () => {
      const { component } = await setup(throwError(() => new Error('nee')));

      expect(component.loading()).toBe(false);
      expect(component.entries()).toEqual([]);
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
