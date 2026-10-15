import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActivityListComponent } from './activity-list.component';
import { ActivityService } from './activity.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Activity } from '../../shared/models';

/*
 * De activiteitenlijst: tabel met per regel inzien / bewerken / verwijderen (ACTIVITY_READ / UPDATE / DELETE).
 */
describe('ActivityListComponent', () => {
  let fixture: ComponentFixture<ActivityListComponent>;
  let component: ActivityListComponent;
  let serviceSpy: jasmine.SpyObj<ActivityService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' };
  const activities = [
    { activityId: 'a-1', name: 'Kajaktocht', description: 'Rivier', activityType: 'tour', ...base },
    { activityId: 'a-2', name: 'Stadswandeling', description: 'Oude stad', activityType: 'excursie', ...base },
  ] as unknown as Activity[];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ActivityService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(activities));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [ActivityListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ActivityService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityListComponent);
    component = fixture.componentInstance;
  });

  it('toont de activiteiten als tabelregels', fakeAsync(() => {
    load();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Kajaktocht');
  }));

  it('toont per regel de drie iconen met ACTIVITY_READ/UPDATE/DELETE', fakeAsync(() => {
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(2);
    expect(buttons('action-delete').length).toBe(2);
    for (const a of ['ACTIVITY_READ', 'ACTIVITY_UPDATE', 'ACTIVITY_DELETE', 'ACTIVITY_CREATE']) {
      expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
    }
  }));

  it('een EMPLOYEE (alleen ACTIVITY_READ) ziet alleen inzien', fakeAsync(() => {
    authSpy.hasAuthority.and.callFake((a: string) => a === 'ACTIVITY_READ');
    fixture = TestBed.createComponent(ActivityListComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(0);
    expect(buttons('action-delete').length).toBe(0);
  }));

  it('inzien opent de detailpagina alleen-lezen; bewerken zonder readonly', fakeAsync(() => {
    load();
    const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

    component.viewActivity(activities[0]);
    expect(navigate).toHaveBeenCalledWith(['/activities', 'a-1'], { queryParams: { readonly: 'true' } });

    component.editActivity(activities[1]);
    expect(navigate).toHaveBeenCalledWith(['/activities', 'a-2']);
  }));

  it('verwijderen: bevestiging met waarschuwing, service en regel weg', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    serviceSpy.delete.and.returnValue(of(void 0));

    component.deleteActivity(activities[0]);
    tick();

    expect(confirmSpy.confirmDelete.calls.mostRecent().args[0]).toContain('Kajaktocht');
    expect(serviceSpy.delete).toHaveBeenCalledWith('a-1');
    expect(component.filtered().map(a => a.activityId)).toEqual(['a-2']);
  }));

  it('verwijderen: geweigerd of mislukt laat de lijst staan', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));
    component.deleteActivity(activities[0]);
    tick();
    expect(serviceSpy.delete).not.toHaveBeenCalled();

    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    serviceSpy.delete.and.returnValue(throwError(() => new Error('nee')));
    component.deleteActivity(activities[0]);
    tick();
    expect(component.filtered().length).toBe(2);
  }));

  it('filtert op naam en type', fakeAsync(() => {
    load();

    component.applyFilter({ target: { value: 'excursie' } } as unknown as Event);

    expect(component.filtered().map(a => a.activityId)).toEqual(['a-2']);
  }));
});
