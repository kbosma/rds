import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingStatusBadgeComponent } from './booking-status-badge.component';

describe('BookingStatusBadgeComponent', () => {
  let fixture: ComponentFixture<BookingStatusBadgeComponent>;

  function render(status: string): HTMLElement {
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.badge') as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStatusBadgeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingStatusBadgeComponent);
  });

  it('kiest de variant naar de betekenis van de status', () => {
    expect(render('aanvraag').classList).toContain('badge-warning');
    expect(render('offerte').classList).toContain('badge-update');
    expect(render('boeking').classList).toContain('badge-info');
    expect(render('betaald').classList).toContain('badge-success');
    expect(render('afgerond').classList).toContain('badge-neutral');
  });

  it('valt terug op neutraal bij een onbekende status', () => {
    const el = render('onbekend');
    expect(el.classList).toContain('badge-neutral');
    expect(el.getAttribute('data-status')).toBe('onbekend');
  });
});
