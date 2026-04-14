import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { OrganizationService } from './organization.service';
import { PersonService } from './person.service';
import { Organization, Person } from '../../shared/models';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <a routerLink="/admin/organizations" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'organizations.backToOrganizations' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('organizations.newTitle' | translate) : ('organizations.editTitle' | translate) + ' — ' + currentName() }}
    </h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <mat-card class="detail-card">
        <mat-card-header>
          <mat-card-title>{{ 'common.details' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSave()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.name' | translate }}</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>

            <div class="actions">
              <a mat-button routerLink="/admin/organizations"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</a>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (!isNew()) {
        <mat-card class="detail-card sub-card">
          <mat-card-header>
            <mat-card-title>{{ 'persons.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (persons().length > 0) {
              @for (person of persons(); track person.persoonId) {
                <div class="sub-item" (click)="navigateToPerson(person)">
                  <div class="sub-item-info">
                    <mat-icon>person</mat-icon>
                    <span>{{ person.firstname }} {{ person.prefix ? person.prefix + ' ' : '' }}{{ person.lastname }}</span>
                  </div>
                  <mat-icon class="sub-item-arrow">chevron_right</mat-icon>
                </div>
              }
            } @else {
              <p class="empty-text">{{ 'organizations.noPersonsLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
      font-size: 22px;
      font-weight: 500;
      margin: 8px 0 24px;
    }
    .detail-card {
      border-radius: 12px;
      max-width: 700px;
    }
    .sub-card {
      margin-top: 24px;
    }
    .full-width { width: 100%; }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .sub-item:hover {
      background-color: #f5f5f5;
    }
    .sub-item-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sub-item-arrow {
      color: #999;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
  `],
})
export class OrganizationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private organizationService = inject(OrganizationService);
  private personService = inject(PersonService);
  private translate = inject(TranslateService);

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  currentName = signal('');
  persons = signal<Person[]>([]);

  private organizationId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.organizationId = id;
      this.loading.set(true);
      this.loadOrganization(id);
    }
  }

  private loadOrganization(id: string) {
    forkJoin({
      organization: this.organizationService.getById(id),
      persons: this.personService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ organization, persons }) => {
        this.currentName.set(organization.name);
        this.form.patchValue({ name: organization.name });
        this.persons.set(persons.filter(p => p.organizationId === id));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('organizations.notFound'), this.translate.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/admin/organizations']);
      },
    });
  }

  onSave() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload: Partial<Organization> = { name: this.form.value.name! };

    if (this.isNew()) {
      this.organizationService.create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('organizations.created'), this.translate.instant('common.close'), { duration: 3000 });
            this.router.navigate(['/admin/organizations']);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('organizations.createError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.organizationService.update(this.organizationId!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.currentName.set(this.form.value.name!);
            this.snackBar.open(this.translate.instant('organizations.saved'), this.translate.instant('common.close'), { duration: 3000 });
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('organizations.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    }
  }

  navigateToPerson(person: Person) {
    this.router.navigate(['/admin/persons', person.persoonId]);
  }
}
