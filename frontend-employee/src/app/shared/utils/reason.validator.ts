import { AbstractControl, ValidationErrors } from '@angular/forms';

export const REASON_MIN_LENGTH = 5;

/** Een verplichte reden: minstens 5 tekens, witruimte telt niet mee (de backend en de database eisen hetzelfde). */
export function reasonHasText(control: AbstractControl): ValidationErrors | null {
  const text = (control.value ?? '').trim();
  return text.length >= REASON_MIN_LENGTH ? null : { reasonTooShort: true };
}
