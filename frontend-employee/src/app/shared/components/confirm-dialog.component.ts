import { Component, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateService } from '@ngx-translate/core';

export interface ConfirmDialogData {
  /** Reeds vertaalde boodschap. */
  message: string;
  /** Reeds vertaalde titel; standaard 'common.confirm'. */
  title?: string;
  /** Reeds vertaald bevestig-label; standaard 'common.continue'. */
  confirmLabel?: string;
  /** Reeds vertaald annuleer-label; standaard 'common.cancel'. */
  cancelLabel?: string;
  /** Kleur van de bevestig-knop; standaard 'primary'. */
  confirmColor?: 'primary' | 'warn';
}

/**
 * Herbruikbare bevestigingsdialoog in de huisstijl (Material), als vervanging
 * voor de native window.confirm() — die een browser-header en een "niet meer
 * tonen"-optie toont. Sluit met `true` bij bevestigen, anders `undefined`.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ cancelLabel }}</button>
      <button mat-raised-button [color]="data.confirmColor ?? 'primary'" [mat-dialog-close]="true">{{ confirmLabel }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-message { margin: 0; font-size: 14px; line-height: 1.5; }
  `],
})
export class ConfirmDialogComponent {
  data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private translate = inject(TranslateService);

  title = this.data.title ?? this.translate.instant('common.confirm');
  cancelLabel = this.data.cancelLabel ?? this.translate.instant('common.cancel');
  confirmLabel = this.data.confirmLabel ?? this.translate.instant('common.continue');
}
