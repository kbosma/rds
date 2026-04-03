import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { PersonService } from '../admin/person.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'profile.title' | translate }}</h1>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.firstname' | translate }}</mat-label>
            <input matInput formControlName="firstname" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.prefix' | translate }}</mat-label>
            <input matInput formControlName="prefix" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'profile.lastname' | translate }}</mat-label>
            <input matInput formControlName="lastname" />
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || form.pristine">
            {{ 'common.save' | translate }}
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-card { max-width: 500px; }
    form { display: flex; flex-direction: column; gap: 8px; }
  `],
})
export class MyProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private personService = inject(PersonService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  form = this.fb.nonNullable.group({
    firstname: ['', Validators.required],
    prefix: [''],
    lastname: ['', Validators.required],
  });

  private personId = '';

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user?.personId) {
      this.personId = user.personId;
      this.personService.getById(this.personId).subscribe((person) => {
        this.form.patchValue({
          firstname: person.firstname,
          prefix: person.prefix ?? '',
          lastname: person.lastname,
        });
        this.form.markAsPristine();
      });
    }
  }

  save() {
    if (this.form.invalid || !this.personId) return;
    this.personService.update(this.personId, this.form.value).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.snackBar.open(this.translate.instant('profile.saved'), '', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open(this.translate.instant('profile.saveError'), '', { duration: 3000 });
      },
    });
  }
}
