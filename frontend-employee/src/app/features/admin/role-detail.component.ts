import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RoleService } from './role.service';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <button mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
      <h1>{{ (isNew() ? 'roles.newRole' : 'roles.editRole') | translate }}</h1>
    </div>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'roles.description' | translate }}</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
          <div class="actions">
            <button mat-button type="button" (click)="goBack()">{{ 'common.cancel' | translate }}</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ 'common.save' | translate }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .full-width { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class RoleDetailComponent implements OnInit {
  private roleService = inject(RoleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  isNew = signal(true);
  saving = signal(false);
  private roleId: string | null = null;

  form = this.fb.group({
    description: ['', Validators.required],
  });

  ngOnInit() {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isNew.set(!this.roleId);
    if (this.roleId) {
      this.roleService.getById(this.roleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (role) => this.form.patchValue(role),
      });
    }
  }

  save() {
    this.saving.set(true);
    const value = { description: this.form.value.description ?? undefined };
    const op = this.roleId
      ? this.roleService.update(this.roleId, value)
      : this.roleService.create(value);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('common.saved'), '', { duration: 3000 });
        this.goBack();
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('common.saveError'), '', { duration: 3000 });
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin/roles']);
  }
}
