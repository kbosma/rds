import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { BookingActivityDialogComponent } from './booking-activity-dialog.component';
import { BookingActivityService } from './booking-activity.service';
import { ActivityService } from '../activities/activity.service';
import { BookingActivity } from '../../shared/models';

/*
 * Een activiteit vindt op één dag plaats: één datum plus een van- en tot-tijd (24-uurs).
 * Een tot-tijd vóór de van-tijd betekent dat de activiteit de volgende dag eindigt.
 */
describe('BookingActivityDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<BookingActivityDialogComponent>>;
  let service: jasmine.SpyObj<BookingActivityService>;

  function setup(bookingActivity?: BookingActivity) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    service = jasmine.createSpyObj('BookingActivityService', ['create', 'update']);
    service.create.and.returnValue(of({} as BookingActivity));
    service.update.and.returnValue(of({} as BookingActivity));
    const activityService = jasmine.createSpyObj('ActivityService', ['getAll']);
    activityService.getAll.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [BookingActivityDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { bookingId: 'bk-1', bookingActivity } },
        { provide: BookingActivityService, useValue: service },
        { provide: ActivityService, useValue: activityService },
      ],
    });
    const fixture = TestBed.createComponent(BookingActivityDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('vereist datum, van-tijd en tot-tijd', () => {
    const component = setup();
    component.form.patchValue({ activityId: 'act-1' });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ activityDate: '2026-07-02', fromTime: '09:00', untilTime: '12:00' });
    expect(component.form.valid).toBeTrue();
  });

  it('herkent een nachtelijke activiteit aan tot-tijd vóór van-tijd', () => {
    const component = setup();
    component.form.patchValue({ fromTime: '22:00', untilTime: '02:00' });
    expect(component.endsNextDay()).toBeTrue();
    component.form.patchValue({ fromTime: '09:00', untilTime: '12:00' });
    expect(component.endsNextDay()).toBeFalse();
  });

  it('stuurt datum en tijden mee bij toevoegen', () => {
    const component = setup();
    component.form.patchValue({
      activityId: 'act-1', activityDate: '2026-07-02', fromTime: '22:00', untilTime: '02:00', meetingPoint: 'Haven', totalPrice: 10,
    });
    component.onSubmit();
    expect(service.create).toHaveBeenCalledWith(jasmine.objectContaining({
      bookingId: 'bk-1', activityId: 'act-1', activityDate: '2026-07-02', fromTime: '22:00', untilTime: '02:00',
    }));
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('toont bestaande tijden zonder seconden bij bewerken', () => {
    const component = setup({
      bookingActivityId: 'ba-1', bookingId: 'bk-1', activityId: 'act-1', activityName: 'Tour', activityType: 'TOUR',
      activityDate: '2026-07-02', fromTime: '09:00:00', untilTime: '12:30:00', meetingPoint: '', totalPrice: 0,
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
    });
    expect(component.form.getRawValue().fromTime).toBe('09:00');
    expect(component.form.getRawValue().untilTime).toBe('12:30');
  });
});
