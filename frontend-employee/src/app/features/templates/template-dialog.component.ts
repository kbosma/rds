import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TemplateService } from './template.service';
import { TemplateBodyEditorComponent } from '../../shared/template-editor/template-body-editor.component';
import { BOOKING_REPEAT_TABLES, DOCUMENT_VARIABLE_GROUPS } from '../../shared/template-editor/template-variables';
import { DocumentTemplate } from '../../shared/models';

export interface TemplateDialogData {
  template?: DocumentTemplate;
  /** Alleen inzien: niets is te wijzigen; een geüploade template kan wel gedownload worden. */
  readOnly?: boolean;
}

@Component({
  selector: 'app-template-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    TemplateBodyEditorComponent,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ (readOnly ? 'templates.viewTitle' : (isEdit ? 'templates.editTitle' : 'templates.newTitle')) | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.name' | translate }}</mat-label>
        <input matInput [(ngModel)]="name" [disabled]="readOnly" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.description' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="description" rows="3" [disabled]="readOnly"></textarea>
      </mat-form-field>

      <!-- Een nieuwe template kan geüpload of in de editor gemaakt worden; een bestaande houdt zijn soort. -->
      @if (!readOnly && (!isEdit || canSwitchToEditor)) {
        <mat-button-toggle-group class="mode-toggle" [value]="mode()" (change)="setMode($event.value)"
                                 [attr.aria-label]="'templates.mode' | translate">
          <mat-button-toggle value="upload">{{ 'templates.modeUpload' | translate }}</mat-button-toggle>
          <mat-button-toggle value="editor">{{ 'templates.modeEditor' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>
      }

      @if (mode() === 'editor') {
        @if (canSwitchToEditor) {
          <p class="switch-warning">{{ 'templates.switchWarning' | translate }}</p>
        }
        @if (!readOnly) {
          <p class="editor-hint">{{ 'templates.editorHint' | translate }}</p>
        }
        <app-template-body-editor [(ngModel)]="sourceHtml" [disabled]="readOnly" [variableGroups]="variableGroups"
                                  [repeatTables]="repeatTables"></app-template-body-editor>
      } @else if (readOnly) {
        <button mat-stroked-button color="primary" class="download-btn" (click)="download()">
          <mat-icon>download</mat-icon> {{ 'templates.download' | translate }}
        </button>
      } @else {
      <!-- File picker -->
      <div class="upload-section">
        <input type="file" accept=".docx" #fileInput (change)="onFileSelected($event)" hidden />
        <button mat-stroked-button color="primary" (click)="fileInput.click()">
          <mat-icon>upload_file</mat-icon> {{ 'templates.chooseFile' | translate }}
        </button>
        @if (selectedFileName()) {
          <span class="file-name">{{ selectedFileName() }}</span>
        }
      </div>

      <!-- Drag and drop -->
      <div class="dropzone"
           [class.drag-over]="dragOver()"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        <mat-icon class="dropzone-icon">cloud_upload</mat-icon>
        <p class="dropzone-text">{{ 'templates.dropzoneText' | translate }}</p>
        <p class="dropzone-hint">{{ 'templates.dropzoneHint' | translate }}</p>
      </div>
      }

      @if (errorMessage()) {
        <p class="error-text">{{ errorMessage() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ (readOnly ? 'common.close' : 'common.cancel') | translate }}</button>
      @if (!readOnly) {
        <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave() || saving()">
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .mode-toggle { margin-bottom: 16px; }
    .switch-warning { font-size: 13px; color: #b26a00; margin: 0 0 8px; }
    .editor-hint { font-size: 13px; color: #666; margin: 0 0 8px; }
    .upload-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .file-name {
      font-size: 13px;
      color: #555;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
    .dropzone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      margin-bottom: 8px;
    }
    .dropzone.drag-over {
      border-color: var(--theme-primary);
      background-color: #e3f2fd;
    }
    .dropzone-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #aaa;
    }
    .dropzone-text {
      margin: 8px 0 4px;
      font-size: 14px;
      color: #555;
    }
    .dropzone-hint {
      margin: 0;
      font-size: 12px;
      color: #999;
    }
    .error-text {
      color: #c62828;
      font-size: 13px;
      margin-top: 8px;
    }
  `],
})
export class TemplateDialogComponent {
  private dialogRef = inject(MatDialogRef<TemplateDialogComponent>);
  private data: TemplateDialogData = inject(MAT_DIALOG_DATA);
  private templateService = inject(TemplateService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  isEdit: boolean;
  /** Een geüploade template (zonder bron-HTML) kan vervangen worden door een template uit de editor. */
  readonly canSwitchToEditor: boolean;
  readonly readOnly: boolean;
  name: string;
  description: string;

  /** Geüpload .docx, of in de editor gemaakt (de backend bouwt dan het .docx bij het opslaan). */
  mode = signal<'upload' | 'editor'>('upload');
  sourceHtml = '';
  readonly variableGroups = DOCUMENT_VARIABLE_GROUPS;
  readonly repeatTables = BOOKING_REPEAT_TABLES;

  fileData = signal<number[] | null>(null);
  selectedFileName = signal('');
  dragOver = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  constructor() {
    this.isEdit = !!this.data.template;
    this.readOnly = !!this.data.readOnly && this.isEdit;
    this.canSwitchToEditor = this.isEdit && !this.readOnly && this.data.template?.sourceHtml == null;
    this.name = this.data.template?.name ?? '';
    this.description = this.data.template?.description ?? '';
    // Een template die in de editor is gemaakt blijft in de editor te bewerken; een geüploade niet.
    if (this.data.template?.sourceHtml != null) {
      this.mode.set('editor');
      this.sourceHtml = this.data.template.sourceHtml;
    }
  }

  setMode(mode: 'upload' | 'editor') {
    this.mode.set(mode);
    this.errorMessage.set('');
    // De editor heeft meer ruimte nodig dan het uploadformulier.
    this.dialogRef.updateSize(mode === 'editor' ? '980px' : '500px');
  }

  canSave(): boolean {
    if (!this.name) return false;
    if (this.mode() === 'editor') return this.hasContent();
    if (!this.isEdit && !this.fileData()) return false;
    return true;
  }

  /** Een lege editor ("<p></p>") is geen template. */
  private hasContent(): boolean {
    const text = this.sourceHtml.replace(/<[^>]*>/g, '').trim();
    return text.length > 0 || /<(img|table)\b/i.test(this.sourceHtml);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  download() {
    const template = this.data.template;
    if (!template) return;
    this.templateService.getContent(template.documentTemplateId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = template.name + '.docx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open(this.translate.instant('templates.downloadError'), this.translate.instant('common.close'), { duration: 4000 }),
    });
  }

  save() {
    if (this.readOnly || !this.canSave() || this.saving()) return;

    this.saving.set(true);
    const payload: { name: string; description: string; templateData?: number[]; sourceHtml?: string } = {
      name: this.name,
      description: this.description,
    };
    if (this.mode() === 'editor') {
      payload.sourceHtml = this.sourceHtml;
    } else if (this.fileData()) {
      payload.templateData = this.fileData()!;
    }

    const request$ = this.isEdit
      ? this.templateService.update(this.data.template!.documentTemplateId, payload)
      : this.templateService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('templates.saved'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        // Bij een template uit de editor is de servermelding nuttig (bv. een afbeelding die niet kan);
        // anders de algemene tekst.
        const serverMessage = err?.error?.message;
        const text = this.mode() === 'editor' && typeof serverMessage === 'string' && serverMessage
          ? serverMessage
          : this.translate.instant('templates.saveError');
        this.snackBar.open(text, this.translate.instant('common.close'), { duration: 7000 });
      },
    });
  }

  private processFile(file: File) {
    this.errorMessage.set('');

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx') {
      this.errorMessage.set(this.translate.instant('templates.invalidFileType'));
      return;
    }

    this.selectedFileName.set(file.name);
    this.blobToByteArray(file);
  }

  private blobToByteArray(blob: Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const byteArray = Array.from(new Uint8Array(arrayBuffer));
      this.fileData.set(byteArray);
    };
    reader.readAsArrayBuffer(blob);
  }
}
