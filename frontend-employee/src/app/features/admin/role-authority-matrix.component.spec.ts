import { TestBed } from '@angular/core/testing';
import { RoleAuthorityMatrixComponent } from './role-authority-matrix.component';
import { Authority } from '../../shared/models';

describe('RoleAuthorityMatrixComponent', () => {
  const authorities: Authority[] = [
    { authorityId: '1', description: 'BOOKING_READ', domain: 'BOOKING' },
    { authorityId: '2', description: 'BOOKING_UPDATE', domain: 'BOOKING' },
    { authorityId: '3', description: 'QUOTE_SEND', domain: 'BOOKING' },
    { authorityId: '4', description: 'PAYMENT_READ', domain: 'PAYMENT' },
    { authorityId: '5', description: 'PLATFORM_ADMIN', domain: 'PLATFORM' },
  ];

  function render(grantable: string[], assigned: string[], editable = true) {
    const fixture = TestBed.createComponent(RoleAuthorityMatrixComponent);
    fixture.componentRef.setInput('authorities', authorities);
    fixture.componentRef.setInput('grantable', new Set(grantable));
    fixture.componentRef.setInput('assigned', new Set(assigned));
    fixture.componentRef.setInput('newNames', new Set(['PAYMENT_READ']));
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    return fixture;
  }

  it('maakt per onderwerp een rij met CRUD-kolommen en de rest onder Overig', () => {
    const component = render(['BOOKING_READ', 'BOOKING_UPDATE', 'QUOTE_SEND', 'PAYMENT_READ'], []).componentInstance;

    const booking = component.rows().find((r) => r.domain === 'BOOKING')!;
    expect(booking.read?.description).toBe('BOOKING_READ');
    expect(booking.update?.description).toBe('BOOKING_UPDATE');
    expect(booking.create).toBeUndefined();
    expect(booking.other.map((a) => a.description)).toEqual(['QUOTE_SEND']);
  });

  it('laat een onderwerp weg dat de gebruiker niet kan uitdelen en de rol niet heeft', () => {
    const component = render(['BOOKING_READ'], []).componentInstance;

    expect(component.rows().map((r) => r.domain)).toEqual(['BOOKING']);
  });

  it('alleen uitdeelbare rechten zijn aan te vinken, en alleen als de rol wijzigbaar is', () => {
    const editable = render(['BOOKING_READ'], ['PAYMENT_READ']).componentInstance;
    expect(editable.canChange(authorities[0])).toBe(true);
    expect(editable.canChange(authorities[3])).toBe(false); // de rol heeft hem wel, maar de gebruiker zelf niet

    const locked = render(['BOOKING_READ'], [], false).componentInstance;
    expect(locked.canChange(authorities[0])).toBe(false);
  });

  it('zet het label Nieuw bij nieuwe rechten', () => {
    const fixture = render(['PAYMENT_READ'], []);
    expect((fixture.nativeElement as HTMLElement).querySelector('.badge-new')).not.toBeNull();
  });

  it('meldt aan- en uitvinken', () => {
    const fixture = render(['BOOKING_READ'], []);
    const events: unknown[] = [];
    fixture.componentInstance.toggle.subscribe((e) => events.push(e));

    (fixture.nativeElement.querySelector('mat-checkbox[data-authority="BOOKING_READ"] input') as HTMLInputElement).click();

    expect(events).toEqual([{ authority: authorities[0], checked: true }]);
  });
});
