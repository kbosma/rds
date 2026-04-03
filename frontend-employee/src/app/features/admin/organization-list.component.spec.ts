import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizationListComponent } from './organization-list.component';

describe('OrganizationListComponent', () => {
  let fixture: ComponentFixture<OrganizationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(OrganizationListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});