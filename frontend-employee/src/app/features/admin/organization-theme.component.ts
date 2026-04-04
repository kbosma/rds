import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from './theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { OrganizationTheme } from '../../shared/models';

@Component({
  selector: 'app-organization-theme',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'theme.title' | translate }}</h1>

    <div class="theme-layout">
      <mat-card class="theme-form-card">
        <mat-card-header>
          <mat-card-title>{{ 'theme.settings' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="color-fields">
              <mat-form-field>
                <mat-label>{{ 'theme.primaryColor' | translate }}</mat-label>
                <input matInput formControlName="primaryColor" type="text" />
              </mat-form-field>
              <input type="color"
                     [value]="form.get('primaryColor')!.value"
                     (input)="form.get('primaryColor')!.setValue($any($event.target).value)"
                     class="color-picker" />
            </div>

            <div class="color-fields">
              <mat-form-field>
                <mat-label>{{ 'theme.accentColor' | translate }}</mat-label>
                <input matInput formControlName="accentColor" type="text" />
              </mat-form-field>
              <input type="color"
                     [value]="form.get('accentColor')!.value"
                     (input)="form.get('accentColor')!.setValue($any($event.target).value)"
                     class="color-picker" />
            </div>

            <mat-form-field class="full-width">
              <mat-label>{{ 'theme.logoUrl' | translate }}</mat-label>
              <input matInput formControlName="logoUrl" type="text" />
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
              <mat-icon>save</mat-icon>
              {{ 'common.save' | translate }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="preview-card">
        <mat-card-header>
          <mat-card-title>{{ 'theme.preview' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="preview-container">
            <div class="preview-toolbar" [style.background]="form.get('primaryColor')!.value">
              <span class="preview-toolbar-text">RDS - Reis Dossier Systeem</span>
            </div>
            <div class="preview-sidebar">
              <div class="preview-nav-item active"
                   [style.border-left-color]="form.get('primaryColor')!.value"
                   [style.background]="form.get('primaryColor')!.value + '1a'">
                <span [style.color]="form.get('primaryColor')!.value">Dashboard</span>
              </div>
              <div class="preview-nav-item">
                <span>Boekingen</span>
              </div>
              <div class="preview-nav-item">
                <span>Boekers</span>
              </div>
            </div>
            <div class="preview-accent-bar">
              <div class="preview-accent-chip" [style.background]="form.get('accentColor')!.value">
                Accent
              </div>
              <div class="preview-accent-chip" [style.background]="form.get('primaryColor')!.value">
                Primary
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .theme-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .color-fields {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .color-fields mat-form-field {
      flex: 1;
    }
    .color-picker {
      width: 48px;
      height: 48px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      padding: 2px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .preview-container {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    .preview-toolbar {
      padding: 12px 16px;
      color: white;
      font-weight: 500;
    }
    .preview-toolbar-text {
      font-size: 14px;
    }
    .preview-sidebar {
      background: #fafafa;
      padding: 8px 0;
    }
    .preview-nav-item {
      padding: 10px 16px;
      border-left: 4px solid transparent;
      font-size: 13px;
      color: #333;
    }
    .preview-nav-item.active {
      font-weight: 500;
    }
    .preview-accent-bar {
      display: flex;
      gap: 8px;
      padding: 16px;
      background: #f5f5f5;
    }
    .preview-accent-chip {
      padding: 6px 16px;
      border-radius: 16px;
      color: white;
      font-size: 12px;
      font-weight: 500;
    }
    @media (max-width: 900px) {
      .theme-layout {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class OrganizationThemeComponent implements OnInit {
  private themeService = inject(ThemeService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  private existingThemeId = signal<string | null>(null);

  form = this.fb.group({
    primaryColor: ['#1976d2', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
    accentColor: ['#ff9800', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
    logoUrl: [''],
  });

  ngOnInit(): void {
    this.themeService.getMyTheme().subscribe({
      next: (theme) => {
        this.existingThemeId.set(theme.organizationThemeId);
        this.form.patchValue({
          primaryColor: theme.primaryColor,
          accentColor: theme.accentColor,
          logoUrl: theme.logoUrl ?? '',
        });
      },
      error: () => {
        // No theme yet — use defaults
      },
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const organizationId = this.auth.currentUser()?.organizationId;
    if (!organizationId) return;

    const payload: Partial<OrganizationTheme> = {
      organizationId,
      primaryColor: this.form.value.primaryColor!,
      accentColor: this.form.value.accentColor!,
      logoUrl: this.form.value.logoUrl || null,
    };

    const themeId = this.existingThemeId();
    const request$ = themeId
      ? this.themeService.update(themeId, payload)
      : this.themeService.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.existingThemeId.set(saved.organizationThemeId);
        this.themeService.applyTheme(saved);
        this.snackBar.open(
          'theme.saved',
          'OK',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open(
          'theme.saveError',
          'OK',
          { duration: 3000 }
        );
      },
    });
  }
}
