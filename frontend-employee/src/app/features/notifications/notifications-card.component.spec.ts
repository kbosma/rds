import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NotificationsCardComponent } from './notifications-card.component';
import { NotificationService } from './notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { BookingNotification } from '../../shared/models';

/*
 * Notificaties: op het dashboard de openstaande van de organisatie (met link naar de boeking), bij een boeking alle
 * notificaties van die boeking (open bovenaan). Afhandelen alleen met NOTIFICATION_UPDATE.
 */
describe('NotificationsCardComponent', () => {
  let fixture: ComponentFixture<NotificationsCardComponent>;
  let serviceSpy: jasmine.SpyObj<NotificationService>;

  const n = (changes: Partial<BookingNotification>): BookingNotification => ({
    notificationId: 'n-1', bookingId: 'b-1', bookingNumber: 'BK-2026-00042', kind: 'alles_betaald',
    title: 'Alles betaald: de reisgegevens kunnen verstuurd worden (BK-2026-00042)', notifiedAt: '2026-11-11T08:00:00',
    handled: false, handledAt: null, handledBy: null, handledByName: null, ...changes,
  });

  function setup(authorities: string[], bookingId: string | null = null) {
    serviceSpy = jasmine.createSpyObj('NotificationService', ['getOpen', 'getByBooking', 'handle']);
    serviceSpy.getOpen.and.returnValue(of([n({}), n({ notificationId: 'n-2', kind: 'op_reis', title: 'Op reis' })]));
    serviceSpy.getByBooking.and.returnValue(of([
      n({ notificationId: 'n-3', handled: true, handledAt: '2026-11-10T10:00:00', handledByName: 'Pieter de Groot' }),
      n({ notificationId: 'n-4', kind: 'terugboeking', title: 'Betaling teruggedraaid' }),
    ]));
    serviceSpy.handle.and.callFake((id: string) => of(n({ notificationId: id, handled: true, handledAt: '2026-11-11T09:00:00', handledByName: 'Pieter' })));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority', 'currentUser']);
    authSpy.currentUser.and.returnValue({ roles: [] });
    authSpy.hasAuthority.and.callFake((a: string) => authorities.includes(a));
    TestBed.configureTestingModule({
      imports: [NotificationsCardComponent, NoopAnimationsModule],
      providers: [provideRouter([]), { provide: NotificationService, useValue: serviceSpy }, { provide: AuthService, useValue: authSpy }],
    });
    fixture = TestBed.createComponent(NotificationsCardComponent);
    if (bookingId) fixture.componentRef.setInput('bookingId', bookingId);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('toont op het dashboard de openstaande notificaties met een link naar de boeking', () => {
    const el = setup(['NOTIFICATION_READ', 'NOTIFICATION_UPDATE']);

    expect(serviceSpy.getOpen).toHaveBeenCalled();
    expect(el.querySelectorAll('.item').length).toBe(2);
    expect(el.querySelector('.booking-link')?.textContent).toContain('BK-2026-00042');
    expect(el.querySelector('.count')?.textContent).toContain('2');
  });

  it('handelt een notificatie af; op het dashboard verdwijnt ze dan uit de lijst', () => {
    const el = setup(['NOTIFICATION_READ', 'NOTIFICATION_UPDATE']);

    (el.querySelector('.handle-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(serviceSpy.handle).toHaveBeenCalledWith('n-1');
    expect(el.querySelectorAll('.item').length).toBe(1);
  });

  it('toont bij een boeking alle notificaties, open bovenaan, en wie een afgehandelde afhandelde', () => {
    const el = setup(['NOTIFICATION_READ', 'NOTIFICATION_UPDATE'], 'b-1');
    const items = el.querySelectorAll('.item');

    expect(serviceSpy.getByBooking).toHaveBeenCalledWith('b-1');
    expect(items[0].classList).not.toContain('handled');
    expect(items[1].classList).toContain('handled');
    expect(items[1].textContent).toContain('Pieter de Groot');
    expect(el.querySelector('.booking-link')).toBeNull();
  });

  it('meldt het afhandelen, zodat de boeking haar (mogelijk afgeronde) status opnieuw kan laden', () => {
    const el = setup(['NOTIFICATION_READ', 'NOTIFICATION_UPDATE'], 'b-1');
    const handled = jasmine.createSpy('handled');
    fixture.componentInstance.handled.subscribe(handled);

    (el.querySelector('.handle-btn') as HTMLButtonElement).click();

    expect(handled).toHaveBeenCalledWith(jasmine.objectContaining({ notificationId: 'n-4', handled: true }));
  });

  it('biedt afhandelen niet aan zonder NOTIFICATION_UPDATE', () => {
    const el = setup(['NOTIFICATION_READ']);

    expect(el.querySelector('.handle-btn')).toBeNull();
  });
});
