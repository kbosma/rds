import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment } from '../../shared/models';

export interface MolliePaymentEditDialogData {
  payment: MolliePayment;
}

/**
 * Een betaling die nog niet bij Mollie is aangemaakt (nog geen Mollie-id) is alleen een
 * "aankondiging" en mag nog worden aangepast (omschrijving en bedrag). Zodra de betaling bij Mollie
 * bestaat is ze geschiedenis en kan ze niet meer worden gewijzigd; de lijst biedt dan geen
 * bewerkicoon aan.
 */
@Component({
  selector: 'app-mollie-payment-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'payments.editTitle' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'common.description' | translate }}</mat-label>
          <input matInput formControlName="description" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'common.amount' | translate }}</mat-label>
          <input matInput type="number" step="0.01" min="0.01" formControlName="amount" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display: flex; flex-direction: column; min-width: 340px; }`],
})
export class MolliePaymentEditDialogComponent {
  private data: MolliePaymentEditDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MolliePaymentEditDialogComponent>);
  private paymentService = inject(MolliePaymentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  saving = signal(false);

  form = this.fb.nonNullable.group({
    description: [this.data.payment.description ?? '', [Validators.required, Validators.maxLength(255)]],
    amount: [this.data.payment.amount, [Validators.required, Validators.min(0.01)]],
  });

  save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const { description, amount } = this.form.getRawValue();
    this.paymentService.update(this.data.payment.molliePaymentId, { ...this.data.payment, description, amount })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(true);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          // 409: de betaling bestaat inmiddels bij Mollie (bv. de klant betaalde net) en kan niet meer worden gewijzigd.
          const key = err.status === 409 ? 'payments.lockedError' : 'common.saveError';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
