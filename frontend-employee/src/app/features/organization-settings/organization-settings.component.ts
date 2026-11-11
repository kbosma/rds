import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { TemplateService } from '../templates/template.service';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { OrganizationSettingsService } from './organization-settings.service';
import { DocumentTemplate, EmailTemplate } from '../../shared/models';

/**
 * Organisatie-instellingen: de keuzes die het systeem nodig heeft om zelf iets te doen. Nu: welke Word-template de
 * offerte is en welke e-mailtemplate de offerte begeleidt. Een MANAGER wijzigt ze; wie alleen mag lezen ziet ze.
 */
@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, DatePipe, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslatePipe,
  ],
  template: `
    <h1>{{ 'orgSettings.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>{{ 'orgSettings.quoteTitle' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="intro">{{ 'orgSettings.quoteIntro' | translate }}</p>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field class="full-width">
              <mat-label>{{ 'orgSettings.quoteDocumentTemplate' | translate }}</mat-label>
              <mat-select formControlName="quoteDocumentTemplateId" class="quote-document-template">
                <mat-option [value]="null">{{ 'orgSettings.none' | translate }}</mat-option>
                @for (t of documentTemplates(); track t.documentTemplateId) {
                  <mat-option [value]="t.documentTemplateId">{{ t.name }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'orgSettings.quoteDocumentHint' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>{{ 'orgSettings.quoteEmailTemplate' | translate }}</mat-label>
              <mat-select formControlName="quoteEmailTemplateId" class="quote-email-template">
                <mat-option [value]="null">{{ 'orgSettings.none' | translate }}</mat-option>
                @for (t of emailTemplates(); track t.emailTemplateId) {
                  <mat-option [value]="t.emailTemplateId">{{ t.name }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'orgSettings.quoteEmailHint' | translate }}</mat-hint>
            </mat-form-field>

            @if (modifiedAt()) {
              <p class="modified">{{ 'orgSettings.modifiedAt' | translate }} {{ modifiedAt() | date:'dd-MM-yyyy HH:mm' }}</p>
            }

            @if (canUpdate()) {
              <button mat-flat-button class="act-update save-btn" type="submit" [disabled]="saving() || form.pristine">
                <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
              </button>
            } @else {
              <p class="read-only-note">{{ 'orgSettings.readOnly' | translate }}</p>
            }
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .loading { display: flex; justify-content: center; padding: 48px; }
    .settings-card { max-width: 720px; }
    .intro { color: var(--ui-text-secondary, #555); margin: 0 0 16px; }
    .full-width { width: 100%; margin-bottom: 16px; }
    .modified, .read-only-note { color: var(--ui-text-secondary, #555); font-size: 13px; }
  `],
})
export class OrganizationSettingsComponent implements OnInit {
  private settingsService = inject(OrganizationSettingsService);
  private templateService = inject(TemplateService);
  private emailTemplateService = inject(EmailTemplateService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  documentTemplates = signal<DocumentTemplate[]>([]);
  emailTemplates = signal<EmailTemplate[]>([]);
  modifiedAt = signal<string | null>(null);
  canUpdate = computed(() => !!this.authService.currentUser() && this.authService.hasAuthority('ORGANIZATION_SETTINGS_UPDATE'));

  form = this.fb.group({
    quoteDocumentTemplateId: this.fb.control<string | null>(null),
    quoteEmailTemplateId: this.fb.control<string | null>(null),
  });

  ngOnInit() {
    if (!this.canUpdate()) {
      this.form.disable();
    }
    forkJoin({
      settings: this.settingsService.getMine(),
      documentTemplates: this.templateService.getAll(),
      emailTemplates: this.emailTemplateService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ settings, documentTemplates, emailTemplates }) => {
        this.documentTemplates.set(documentTemplates);
        this.emailTemplates.set(emailTemplates);
        this.form.reset({
          quoteDocumentTemplateId: settings.quoteDocumentTemplateId,
          quoteEmailTemplateId: settings.quoteEmailTemplateId,
        });
        this.modifiedAt.set(settings.modifiedAt);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify('orgSettings.loadError', 5000);
      },
    });
  }

  save() {
    if (!this.canUpdate()) return;
    this.saving.set(true);
    const { quoteDocumentTemplateId, quoteEmailTemplateId } = this.form.getRawValue();
    this.settingsService.updateMine({ quoteDocumentTemplateId, quoteEmailTemplateId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.modifiedAt.set(saved.modifiedAt);
          this.notify('orgSettings.saved', 3000);
        },
        error: () => {
          this.saving.set(false);
          this.notify('orgSettings.saveError', 5000);
        },
      });
  }

  private notify(key: string, duration: number) {
    this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration });
  }
}
