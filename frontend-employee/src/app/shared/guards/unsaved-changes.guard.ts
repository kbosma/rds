import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../services/confirm.service';

/** Een scherm met een concept dat nog niet is opgeslagen. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Vraagt om bevestiging als je een scherm met niet-opgeslagen wijzigingen verlaat. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const translate = inject(TranslateService);
  return inject(ConfirmService).confirm(translate.instant('common.unsavedChanges'), {
    confirmLabel: translate.instant('common.discardChanges'),
    confirmColor: 'warn',
  });
};
