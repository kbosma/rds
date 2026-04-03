import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelerListComponent } from './traveler-list.component';

describe('TravelerListComponent', () => {
  let fixture: ComponentFixture<TravelerListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelerListComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TravelerListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show placeholder text', () => {
    expect(fixture.nativeElement.textContent).toContain('binnenkort beschikbaar');
  });
});