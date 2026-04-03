import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupplierListComponent } from './supplier-list.component';

describe('SupplierListComponent', () => {
  let fixture: ComponentFixture<SupplierListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SupplierListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});