import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TemplateService } from './template.service';
import { DocumentTemplate } from '../../shared/models';

export interface TemplateDialogData {
  template?: DocumentTemplate;
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
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ (isEdit ? 'templates.editTitle' : 'templates.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.name' | translate }}</mat-label>
        <input matInput [(ngModel)]="name" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.description' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="description" rows="3"></textarea>
      </mat-form-field>

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

      @if (errorMessage()) {
        <p class="error-text">{{ errorMessage() }}</p>
      }
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
      border-color: #1976d2;
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
  name: string;
  description: string;

  fileData = signal<number[] | null>(null);
  selectedFileName = signal('');
  dragOver = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  constructor() {
    this.isEdit = !!this.data.template;
    this.name = this.data.template?.name ?? '';
    this.description = this.data.template?.description ?? '';
  }

  canSave(): boolean {
    if (!this.name) return false;
    if (!this.isEdit && !this.fileData()) return false;
    return true;
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

  save() {
    if (!this.canSave()) return;

    this.saving.set(true);
    const payload: any = {
      name: this.name,
      description: this.description,
    };
    if (this.fileData()) {
      payload.templateData = this.fileData();
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
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('templates.saveError'), this.translate.instant('common.close'), { duration: 5000 });
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
