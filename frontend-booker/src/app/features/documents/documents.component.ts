import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';

interface Document {
  documentId: string;
  displayname: string;
  createdAt: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [DatePipe, MatTableModule, MatIconModule, MatProgressSpinnerModule, MatCardModule],
  template: `
    <h1>Documenten</h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (documents().length === 0) {
      <mat-card class="empty-card">
        <mat-card-content class="empty-content">
          <mat-icon>description</mat-icon>
          <p>Geen documenten beschikbaar.</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="documents()" class="full-width">
          <ng-container matColumnDef="displayname">
            <th mat-header-cell *matHeaderCellDef>Document</th>
            <td mat-cell *matCellDef="let doc">
              <div class="doc-name">
                <mat-icon>description</mat-icon>
                <span>{{ doc.displayname }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let doc">{{ doc.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>
        </table>
      </div>
    }
  `,
  styles: [`
    h1 {
      font-size: 22px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width {
      width: 100%;
    }
    .alt-row {
      background-color: #fafafa;
    }
    .doc-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-name mat-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .empty-card {
      border-radius: 12px;
    }
    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: #888;
    }
    .empty-content mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class DocumentsComponent implements OnInit {
  private api = inject(ApiService);

  documents = signal<Document[]>([]);
  loading = signal(true);
  displayedColumns = ['displayname', 'createdAt'];

  ngOnInit() {
    this.api.getAll<Document>('booker-portal/documents').subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
