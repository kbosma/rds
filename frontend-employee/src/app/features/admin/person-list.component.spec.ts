import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonListComponent } from './person-list.component';

describe('PersonListComponent', () => {
  let fixture: ComponentFixture<PersonListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PersonListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});