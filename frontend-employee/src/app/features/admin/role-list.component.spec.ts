import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleListComponent } from './role-list.component';

describe('RoleListComponent', () => {
  let fixture: ComponentFixture<RoleListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RoleListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});