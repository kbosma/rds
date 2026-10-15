import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DocumentService } from './document.service';
import { Document } from '../../shared/models';

export interface DocumentEditDialogData {
  document: Document;
}

/**
 * Wijzigt alleen de weergavenaam van een document; de inhoud verandert nooit. De server vervangt bij een
 * update ook de bytes, dus we halen eerst het volledige document op en sturen dat met de nieuwe naam terug.
 * Ontbreken de bytes in dat antwoord, dan wordt er niets opgeslagen (de inhoud mag nooit verdwijnen).
 */
@Component({
  selector: 'app-document-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'documents.editTitle' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'documents.displayname' | translate }}</mat-label>
          <input matInput formControlName="displayname" />
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
  styles: [`.form { display: flex; flex-direction: column; min-width: 380px; }`],
})
export class DocumentEditDialogComponent {
  private data: DocumentEditDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<DocumentEditDialogComponent>);
  private documentService = inject(DocumentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  saving = signal(false);

  form = this.fb.nonNullable.group({
    displayname: [this.data.document.displayname ?? '', [Validators.required, Validators.maxLength(255)]],
  });

  save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const displayname = this.form.getRawValue().displayname.trim();

    this.documentService.getById(this.data.document.documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (full) => {
          if (!(full as unknown as { document?: unknown }).document) {
            this.fail();
            return;
          }
          this.documentService.update(this.data.document.documentId, { ...full, displayname })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.saving.set(false);
                this.dialogRef.close(true);
              },
              error: () => this.fail(),
            });
        },
        error: () => this.fail(),
      });
  }

  private fail() {
    this.saving.set(false);
    this.snackBar.open(this.translate.instant('common.saveError'), this.translate.instant('common.close'), { duration: 4000 });
  }
}
