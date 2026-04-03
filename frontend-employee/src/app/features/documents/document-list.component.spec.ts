import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentListComponent } from './document-list.component';

describe('DocumentListComponent', () => {
  let fixture: ComponentFixture<DocumentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});