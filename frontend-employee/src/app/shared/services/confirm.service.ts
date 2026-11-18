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
    return (await this.ask(message, options)) === true;
  }

  /**
   * Ja/nee-vraag waarbij "nee" iets anders is dan afbreken: `true` bij de bevestigknop,
   * `false` bij de annuleerknop (bv. "Nee") en `undefined` als de dialoog wordt weggeklikt.
   */
  async ask(message: string, options?: Partial<ConfirmDialogData>): Promise<boolean | undefined> {
    const result = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: { message, ...options },
        width: '420px',
      }).afterClosed()
    );
    return result === true ? true : result === false ? false : undefined;
  }

  /** Verwijder-bevestiging: rode knop met label 'Verwijderen'. */
  confirmDelete(message: string): Promise<boolean> {
    return this.confirm(message, {
      confirmLabel: this.translate.instant('common.delete'),
      confirmColor: 'warn',
    });
  }
}
