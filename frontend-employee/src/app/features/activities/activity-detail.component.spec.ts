import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ActivityDetailComponent } from './activity-detail.component';
import { ActivityService } from './activity.service';
import { Activity } from '../../shared/models';

/*
 * Het activiteitdetail is bewerkbaar, of alleen-lezen als het met ?readonly=true wordt geopend
 * (inzien-icoon in de lijst).
 */
describe('ActivityDetailComponent', () => {
  let serviceSpy: jasmine.SpyObj<ActivityService>;
  const activity = { activityId: 'a-1', name: 'Kajaktocht', description: 'Rivier', activityType: 'tour' } as unknown as Activity;

  function setup(id: string | null, readonly: string | null) {
    serviceSpy = jasmine.createSpyObj('ActivityService', ['getById', 'create', 'update']);
    serviceSpy.getById.and.returnValue(of(activity));
    serviceSpy.update.and.returnValue(of(activity));
    TestBed.configureTestingModule({
      imports: [ActivityDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivityService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: { get: () => id },
          queryParamMap: { get: (k: string) => (k === 'readonly' ? readonly : null) },
        } } },
      ],
    });
    const fixture = TestBed.createComponent(ActivityDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('bewerkbaar: formulier actief en een opslaan-knop', fakeAsync(() => {
    const { fixture, component } = setup('a-1', null);

    expect(component.readOnly()).toBe(false);
    expect(component.form.enabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
  }));

  it('alleen-lezen: formulier uitgeschakeld, gevuld, en geen opslaan-knop', fakeAsync(() => {
    const { fixture, component } = setup('a-1', 'true');

    expect(component.readOnly()).toBe(true);
    expect(component.form.disabled).toBe(true);
    expect(component.form.getRawValue().name).toBe('Kajaktocht');
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
  }));

  it('alleen-lezen: onSubmit slaat nooit iets op', fakeAsync(() => {
    const { component } = setup('a-1', 'true');

    component.onSubmit();

    expect(serviceSpy.update).not.toHaveBeenCalled();
    expect(serviceSpy.create).not.toHaveBeenCalled();
  }));

  it('readonly op een nieuwe activiteit wordt genegeerd (nieuw blijft bewerkbaar)', fakeAsync(() => {
    const { component } = setup(null, 'true');

    expect(component.isNew()).toBe(true);
    expect(component.readOnly()).toBe(false);
    expect(component.form.enabled).toBe(true);
  }));
});
