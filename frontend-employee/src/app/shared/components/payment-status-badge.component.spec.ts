import { TestBed } from '@angular/core/testing';
import { PaymentStatusBadgeComponent } from './payment-status-badge.component';

describe('PaymentStatusBadgeComponent', () => {
  function badge(status: string): HTMLElement {
    const fixture = TestBed.createComponent(PaymentStatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
  }

  it('toont de vertaalde naam van de status en zet de status als data-attribuut voor de kleur', () => {
    const el = badge('paid');

    expect(el.getAttribute('data-status')).toBe('paid');
    expect(el.textContent?.trim()).toBe('Betaald');
  });

  it('toont voor "open" de naam Open', () => {
    expect(badge('open').textContent?.trim()).toBe('Open');
  });
});
