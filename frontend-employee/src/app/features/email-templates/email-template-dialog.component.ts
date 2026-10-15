import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EmailTemplateService } from './email-template.service';
import { TemplateBodyEditorComponent } from '../../shared/template-editor/template-body-editor.component';
import { BOOKING_REPEAT_TABLES, EMAIL_VARIABLE_GROUPS } from '../../shared/template-editor/template-variables';
import { EmailTemplate } from '../../shared/models';

export interface EmailTemplateDialogData {
  template?: EmailTemplate;
}

@Component({
  selector: 'app-email-template-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
    TemplateBodyEditorComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ (isEdit ? 'emailTemplates.editTitle' : 'emailTemplates.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'emailTemplates.name' | translate }}</mat-label>
        <input matInput [(ngModel)]="name" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.description' | translate }}</mat-label>
        <input matInput [(ngModel)]="description" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'emailTemplates.subject' | translate }}</mat-label>
        <input matInput [(ngModel)]="subject" required />
      </mat-form-field>

      <label class="editor-label">{{ 'emailTemplates.bodyHtml' | translate }}</label>
      <app-template-body-editor [(ngModel)]="bodyHtml" [variableGroups]="variableGroups"
                                [repeatTables]="repeatTables"></app-template-body-editor>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave() || saving()">
        @if (saving()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .editor-label { display: block; font-size: 12px; color: #666; margin: 4px 0 6px; }
  `],
})
export class EmailTemplateDialogComponent {
  readonly variableGroups = EMAIL_VARIABLE_GROUPS;
  readonly repeatTables = BOOKING_REPEAT_TABLES;

  private dialogRef = inject(MatDialogRef<EmailTemplateDialogComponent>);
  private data: EmailTemplateDialogData = inject(MAT_DIALOG_DATA);
  private emailTemplateService = inject(EmailTemplateService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  isEdit: boolean;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;

  saving = signal(false);

  constructor() {
    this.isEdit = !!this.data.template;
    this.name = this.data.template?.name ?? '';
    this.description = this.data.template?.description ?? '';
    this.subject = this.data.template?.subject ?? '';
    this.bodyHtml = this.data.template?.bodyHtml ?? '';
  }

  canSave(): boolean {
    return !!this.name.trim() && !!this.subject.trim() && !!this.bodyHtml.trim();
  }

  save() {
    if (!this.canSave()) return;

    this.saving.set(true);
    const payload: Partial<EmailTemplate> = {
      name: this.name.trim(),
      description: this.description.trim(),
      subject: this.subject.trim(),
      bodyHtml: this.bodyHtml,
    };

    const request$ = this.isEdit
      ? this.emailTemplateService.update(this.data.template!.emailTemplateId, payload)
      : this.emailTemplateService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('emailTemplates.saved'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('emailTemplates.saveError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }
}
