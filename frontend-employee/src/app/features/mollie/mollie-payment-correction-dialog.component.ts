import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment } from '../../shared/models';

/** Statussen die een medewerker met de hand mag registreren; de rest (pending, authorized, expired) komt van Mollie. */
export const PAYMENT_CORRECTION_STATUSES = ['paid', 'canceled', 'failed', 'open'];

export const CORRECTION_REASON_MIN_LENGTH = 5;

export interface MolliePaymentCorrectionDialogData {
  payment: MolliePayment;
  /** Huidige status van de betaling; die is niet te kiezen (er verandert dan niets). */
  currentStatus: string | null;
}

function reasonHasText(control: AbstractControl): ValidationErrors | null {
  const text = (control.value ?? '').trim();
  return text.length >= CORRECTION_REASON_MIN_LENGTH ? null : { reasonTooShort: true };
}

/**
 * Een medewerker registreert een correctie van de status van een betaling (bv. de klant betaalde per bank, buiten
 * Mollie om). Dat voegt een NIEUWE regel toe aan de historie, met wie, wanneer en de verplichte reden; de bestaande
 * regels van Mollie blijven ongewijzigd.
 */
@Component({
  selector: 'app-mollie-payment-correction-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'payments.correctionTitle' | translate }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ 'payments.correctionHint' | translate }}</p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'payments.correctionStatus' | translate }}</mat-label>
          <mat-select formControlName="status">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ 'payments.status_' + s | translate }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'payments.correctionReason' | translate }}</mat-label>
          <textarea matInput rows="3" maxlength="500" formControlName="reason"></textarea>
          <mat-hint>{{ 'payments.correctionReasonHint' | translate }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ 'payments.correctionSubmit' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 4px; min-width: 380px; }
    .hint { margin: 0 0 12px; color: var(--ui-text-muted); font-size: 13px; }
  `],
})
export class MolliePaymentCorrectionDialogComponent {
  private data: MolliePaymentCorrectionDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MolliePaymentCorrectionDialogComponent>);
  private paymentService = inject(MolliePaymentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  statuses = PAYMENT_CORRECTION_STATUSES.filter((s) => s !== this.data.currentStatus);
  saving = signal(false);

  form = this.fb.group({
    status: ['', Validators.required],
    reason: ['', [Validators.required, reasonHasText]],
  });

  save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const { status, reason } = this.form.getRawValue();

    this.paymentService.createCorrection(this.data.payment.molliePaymentId, status!, reason!.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('payments.correctionSaved'), '', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('payments.correctionError'), '', { duration: 5000 });
        },
      });
  }
}
