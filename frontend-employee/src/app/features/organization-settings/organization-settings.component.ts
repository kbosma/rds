import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
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

/** Het voorschot moet eerder vervallen (meer weken voor vertrek) dan het restant. */
function weeksOrder(group: AbstractControl): ValidationErrors | null {
  const deposit = group.get('depositWeeksBeforeDeparture')?.value;
  const balance = group.get('balanceWeeksBeforeDeparture')?.value;
  return deposit != null && balance != null && deposit <= balance ? { weeksOrder: true } : null;
}

/**
 * Organisatie-instellingen: de keuzes die het systeem nodig heeft om zelf iets te doen. Nu: welke Word-template de
 * offerte is en welke e-mailtemplate de offerte begeleidt, en het betalingsschema (voorschot, termijnen, betaalmail). Een MANAGER wijzigt ze; wie alleen mag lezen ziet ze.
 */
@Component({
  selector: 'app-organization-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, DatePipe, MatCardModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslatePipe,
  ],
  template: `
    <h1>{{ 'orgSettings.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="settings-form">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>{{ 'orgSettings.quoteTitle' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="intro">{{ 'orgSettings.quoteIntro' | translate }}</p>
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
        </mat-card-content>
      </mat-card>

      <mat-card class="settings-card payments-card">
        <mat-card-header>
          <mat-card-title>{{ 'orgSettings.paymentsTitle' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="intro">{{ 'orgSettings.paymentsIntro' | translate }}</p>
          <div class="number-fields">
            <mat-form-field>
              <mat-label>{{ 'orgSettings.depositPercentage' | translate }}</mat-label>
              <input matInput type="number" min="1" max="100" formControlName="depositPercentage" class="deposit-percentage" />
              <span matTextSuffix>%</span>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'orgSettings.depositWeeks' | translate }}</mat-label>
              <input matInput type="number" min="1" formControlName="depositWeeksBeforeDeparture" class="deposit-weeks" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'orgSettings.balanceWeeks' | translate }}</mat-label>
              <input matInput type="number" min="0" formControlName="balanceWeeksBeforeDeparture" class="balance-weeks" />
            </mat-form-field>
          </div>
          @if (form.hasError('weeksOrder')) {
            <p class="form-error weeks-order-error">{{ 'orgSettings.weeksOrder' | translate }}</p>
          }

          <mat-form-field class="full-width">
            <mat-label>{{ 'orgSettings.paymentEmailTemplate' | translate }}</mat-label>
            <mat-select formControlName="paymentEmailTemplateId" class="payment-email-template">
              <mat-option [value]="null">{{ 'orgSettings.none' | translate }}</mat-option>
              @for (t of emailTemplates(); track t.emailTemplateId) {
                <mat-option [value]="t.emailTemplateId">{{ t.name }}</mat-option>
              }
            </mat-select>
            <mat-hint>{{ 'orgSettings.paymentEmailHint' | translate }}</mat-hint>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <div class="form-footer">
            @if (modifiedAt()) {
              <p class="modified">{{ 'orgSettings.modifiedAt' | translate }} {{ modifiedAt() | date:'dd-MM-yyyy HH:mm' }}</p>
            }

            @if (canUpdate()) {
              <button mat-flat-button class="act-update save-btn" type="submit" [disabled]="saving() || form.pristine || form.invalid">
                <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
              </button>
            } @else {
              <p class="read-only-note">{{ 'orgSettings.readOnly' | translate }}</p>
            }
      </div>
      </form>
    }
  `,
  styles: [`
    .loading { display: flex; justify-content: center; padding: 48px; }
    .settings-form { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }
    .number-fields { display: flex; flex-wrap: wrap; gap: 0 16px; }
    .number-fields mat-form-field { flex: 1 1 180px; }
    .form-error { color: var(--act-delete, #c62828); font-size: 13px; margin: 0 0 12px; }
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
    depositPercentage: this.fb.nonNullable.control(30, [Validators.required, Validators.min(1), Validators.max(100)]),
    depositWeeksBeforeDeparture: this.fb.nonNullable.control(12, [Validators.required, Validators.min(1)]),
    balanceWeeksBeforeDeparture: this.fb.nonNullable.control(6, [Validators.required, Validators.min(0)]),
    paymentEmailTemplateId: this.fb.control<string | null>(null),
  }, { validators: weeksOrder });

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
          depositPercentage: settings.depositPercentage,
          depositWeeksBeforeDeparture: settings.depositWeeksBeforeDeparture,
          balanceWeeksBeforeDeparture: settings.balanceWeeksBeforeDeparture,
          paymentEmailTemplateId: settings.paymentEmailTemplateId,
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
    if (!this.canUpdate() || this.form.invalid) return;
    this.saving.set(true);
    this.settingsService.updateMine(this.form.getRawValue())
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
