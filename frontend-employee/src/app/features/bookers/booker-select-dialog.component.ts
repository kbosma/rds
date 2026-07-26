import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { BookerService } from './booker.service';
import { Booker } from '../../shared/models';

@Component({
  selector: 'app-booker-select-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatListModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'bookers.selectBooker' | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <input matInput (input)="filter($event)" />
      </mat-form-field>
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <mat-nav-list>
          @for (booker of filtered(); track booker.bookerId) {
            <a mat-list-item (click)="select(booker.bookerId)">
              {{ booker.firstname }} {{ booker.prefix }} {{ booker.lastname }}
            </a>
          }
        </mat-nav-list>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } .loading { display: flex; justify-content: center; padding: 16px; }`],
})
export class BookerSelectDialogComponent implements OnInit {
  private bookerService = inject(BookerService);
  private dialogRef = inject(MatDialogRef<BookerSelectDialogComponent>);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  private allBookers: Booker[] = [];
  filtered = signal<Booker[]>([]);

  ngOnInit() {
    this.bookerService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (bookers) => {
        this.allBookers = bookers;
        this.filtered.set(bookers);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filter(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.filtered.set(
      this.allBookers.filter(b =>
        `${b.firstname} ${b.prefix ?? ''} ${b.lastname}`.toLowerCase().includes(term)
      )
    );
  }

  select(bookerId: string) {
    this.dialogRef.close(bookerId);
  }
}
