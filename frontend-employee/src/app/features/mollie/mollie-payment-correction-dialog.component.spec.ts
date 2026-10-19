import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { MolliePaymentCorrectionDialogComponent, PAYMENT_CORRECTION_STATUSES } from './mollie-payment-correction-dialog.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';

describe('MolliePaymentCorrectionDialogComponent', () => {
  const payment = { molliePaymentId: 'p-1' } as MolliePayment;

  async function setup(currentStatus: string | null = 'open') {
    const service = jasmine.createSpyObj<MolliePaymentService>('MolliePaymentService', ['createCorrection']);
    service.createCorrection.and.returnValue(of({} as MolliePaymentStatusEntry));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [MolliePaymentCorrectionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MolliePaymentService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { payment, currentStatus } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MolliePaymentCorrectionDialogComponent);
    const component = fixture.componentInstance;
    spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component, service, dialogRef };
  }

  it('biedt alleen de statussen die met de hand mogen, zonder de huidige status', async () => {
    const { component } = await setup('open');

    expect(component.statuses).toEqual(PAYMENT_CORRECTION_STATUSES.filter((s) => s !== 'open'));
    expect(component.statuses).not.toContain('pending');
    expect(component.statuses).not.toContain('expired');
  });

  it('vereist een status en een reden van minstens 5 tekens (witruimte telt niet mee)', async () => {
    const { component } = await setup();

    component.form.patchValue({ status: 'paid', reason: '  ab  ' });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ reason: 'Betaald per bank' });
    expect(component.form.valid).toBeTrue();
  });

  it('registreert de correctie met een weggeknipte reden en sluit met true', async () => {
    const { component, service, dialogRef } = await setup();
    component.form.patchValue({ status: 'paid', reason: '  Betaald per bank  ' });

    component.save();

    expect(service.createCorrection).toHaveBeenCalledOnceWith('p-1', 'paid', 'Betaald per bank');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('registreert niets zolang het formulier ongeldig is', async () => {
    const { component, service } = await setup();

    component.save();

    expect(service.createCorrection).not.toHaveBeenCalled();
  });

  it('twee keer kort na elkaar opslaan registreert maar één correctie', async () => {
    const { component, service } = await setup();
    component.form.patchValue({ status: 'paid', reason: 'Betaald per bank' });
    service.createCorrection.and.returnValue(new Subject<MolliePaymentStatusEntry>());

    component.save();
    component.save();

    expect(service.createCorrection).toHaveBeenCalledTimes(1);
  });

  it('na een fout kan opnieuw geprobeerd worden', async () => {
    const { component, service, dialogRef } = await setup();
    component.form.patchValue({ status: 'paid', reason: 'Betaald per bank' });
    service.createCorrection.and.returnValues(throwError(() => new Error('fout')), of({} as MolliePaymentStatusEntry));

    component.save();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
    component.save();

    expect(service.createCorrection).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
