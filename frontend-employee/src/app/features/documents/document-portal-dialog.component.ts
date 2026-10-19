import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Document } from '../../shared/models';
import { DocumentService } from './document.service';

export interface DocumentPortalDialogData {
  document: Document;
}

/**
 * Wijzigt de enige eigenschap van een bestaand document die nog kan veranderen: of de boeker het document in het
 * boekerportaal ziet. Naam, inhoud en boeking staan vast. Sluit met `true` na het opslaan.
 */
@Component({
  selector: 'app-document-portal-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.document.displayname }}</h2>
    <mat-dialog-content>
      <mat-checkbox [(ngModel)]="visibleInPortal">{{ 'documents.visibleInPortal' | translate }}</mat-checkbox>
      <p class="hint">{{ 'documents.visibleInPortalHint' | translate }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" class="save-btn" (click)="save()" [disabled]="saving()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.hint { margin: 0 0 0 40px; font-size: 12px; color: var(--ui-text-muted); }`],
})
export class DocumentPortalDialogComponent {
  data: DocumentPortalDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<DocumentPortalDialogComponent>);
  private documentService = inject(DocumentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  visibleInPortal = this.data.document.visibleInPortal;
  saving = signal(false);

  save() {
    if (this.saving()) return;
    this.saving.set(true);
    this.documentService.setPortalVisibility(this.data.document.documentId, this.visibleInPortal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('documents.saved'), this.translate.instant('common.close'), { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('documents.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
