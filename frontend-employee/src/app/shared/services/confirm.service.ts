import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog.component';

/**
 * Opent de bevestigingsdialoog in de huisstijl (ConfirmDialogComponent) en geeft
 * het resultaat als Promise<boolean>. Vervangt de native window.confirm(), zodat
 * er geen browser-header of "niet meer tonen"-optie verschijnt.
 *
 * Gebruik: `if (!await this.confirmService.confirmDelete(message)) return;`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);

  /** Algemene bevestiging. `message` is reeds vertaalde tekst. */
  async confirm(message: string, options?: Partial<ConfirmDialogData>): Promise<boolean> {
    const result = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: { message, ...options },
        width: '420px',
      }).afterClosed()
    );
    return result === true;
  }

  /** Verwijder-bevestiging: rode knop met label 'Verwijderen'. */
  confirmDelete(message: string): Promise<boolean> {
    return this.confirm(message, {
      confirmLabel: this.translate.instant('common.delete'),
      confirmColor: 'warn',
    });
  }
}
