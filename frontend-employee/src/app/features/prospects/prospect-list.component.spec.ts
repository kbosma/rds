import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProspectListComponent } from './prospect-list.component';
import { MatDialog } from '@angular/material/dialog';
import { BookerService } from '../bookers/booker.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Booker } from '../../shared/models';

/*
 * ProspectListComponent toont bookers met status PROSPECT. We verifiëren dat
 * de juiste (gefilterde) service-call wordt gedaan en de data geladen wordt.
 */
describe('ProspectListComponent', () => {
  let component: ProspectListComponent;
  let fixture: ComponentFixture<ProspectListComponent>;
  let bookerServiceSpy: jasmine.SpyObj<BookerService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const mockProspects: Booker[] = [
    {
      bookerId: '1', firstname: 'Klaas', prefix: 'van', lastname: 'Houten',
      callsign: '', telephone: '0612345678', emailaddress: 'klaas@example.com',
      gender: 'man', birthdate: '1985-03-15', initials: 'K.', status: 'prospect',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
    },
    {
      bookerId: '2', firstname: 'Annemiek', prefix: '', lastname: 'Bakker',
      callsign: '', telephone: '0623456789', emailaddress: 'annemiek@example.com',
      gender: 'vrouw', birthdate: '1990-07-20', initials: 'A.', status: 'prospect',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
    },
  ];

  beforeEach(async () => {
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['getByStatus', 'delete']);
    bookerServiceSpy.getByStatus.and.returnValue(of(mockProspects));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [ProspectListComponent, NoopAnimationsModule],
      providers: [
        { provide: BookerService, useValue: bookerServiceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProspectListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load prospects (status=prospect) on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(bookerServiceSpy.getByStatus).toHaveBeenCalledWith('prospect');
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading()).toBe(false);
  }));

  it('should set loading false on error', fakeAsync(() => {
    bookerServiceSpy.getByStatus.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
  }));

  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
    const dialog = () => (component as unknown as { dialog: MatDialog }).dialog;

    function load() {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }

    it('toont per regel inzien, bewerken en verwijderen met de authorities BOOKING_READ/UPDATE/DELETE', fakeAsync(() => {
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      for (const a of ['BOOKING_READ', 'BOOKING_UPDATE', 'BOOKING_DELETE']) {
        expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'BOOKING_READ');
      fixture = TestBed.createComponent(ProspectListComponent);
      component = fixture.componentInstance;
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
    }));

    it('klikken op de regel doet niets meer', fakeAsync(() => {
      load();
      const open = spyOn(dialog(), 'open');

      (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

      expect(open).not.toHaveBeenCalled();
    }));

    it('inzien opent het booker-dialoog alleen-lezen', fakeAsync(() => {
      load();
      const open = spyOn(dialog(), 'open');

      component.viewProspect(mockProspects[0]);

      expect((open.calls.mostRecent().args[1] as { data: { readOnly: boolean } }).data.readOnly).toBe(true);
    }));

    it('bewerken opent het dialoog bewerkbaar en laadt de prospects opnieuw na opslaan', fakeAsync(() => {
      load();
      const open = spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
      bookerServiceSpy.getByStatus.calls.reset();

      component.editProspect(mockProspects[0]);
      tick();

      expect((open.calls.mostRecent().args[1] as { data: { readOnly: boolean } }).data.readOnly).toBe(false);
      expect(bookerServiceSpy.getByStatus).toHaveBeenCalledTimes(1);
    }));

    it('verwijderen: bevestigen, service aanroepen, regel verdwijnt', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      bookerServiceSpy.delete.and.returnValue(of(void 0));

      component.deleteProspect(mockProspects[0]);
      tick();

      expect(bookerServiceSpy.delete).toHaveBeenCalledWith('1');
      expect(component.dataSource.data.map(b => b.bookerId)).toEqual(['2']);
    }));

    it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteProspect(mockProspects[0]);
      tick();

      expect(bookerServiceSpy.delete).not.toHaveBeenCalled();
      expect(component.dataSource.data.length).toBe(2);
    }));
  });
});
