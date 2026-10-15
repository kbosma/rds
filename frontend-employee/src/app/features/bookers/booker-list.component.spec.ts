import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { BookerListComponent } from './booker-list.component';
import { BookerService } from './booker.service';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Booker, Booking } from '../../shared/models';

/*
 * ====================================================================
 * WAT TESTEN WE HIER?
 * ====================================================================
 * BookerListComponent haalt bookers op en toont ze in een tabel.
 * We willen verifiëren dat:
 *   1. De component data laadt bij initialisatie
 *   2. De loading spinner verdwijnt na het laden
 *   3. De booker-data in de tabel verschijnt
 *   4. De filterfunctie werkt
 *   5. De component correct omgaat met errors
 *
 * NIEUWE CONCEPTEN:
 * - ComponentFixture: wrapper rond de component, geeft toegang
 *   tot de component-instantie EN de DOM (het gerenderde HTML)
 * - fixture.detectChanges(): triggert Angular change detection,
 *   waardoor de template opnieuw rendert. MOET je aanroepen na
 *   elke wijziging die de UI beïnvloedt!
 * - fakeAsync/tick: simuleert het verstrijken van tijd, nodig voor
 *   setTimeout() calls in de component
 * - nativeElement.querySelector(): zoek elementen in de DOM,
 *   precies zoals document.querySelector() in een browser
 * ====================================================================
 */

describe('BookerListComponent', () => {
  let component: BookerListComponent;
  let fixture: ComponentFixture<BookerListComponent>;
  let bookerServiceSpy: jasmine.SpyObj<BookerService>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;

  // Testdata — 2 bookers zodat we filter-logica kunnen testen
  const mockBookers: Booker[] = [
    {
      bookerId: '1',
      status: 'active',
      firstname: 'Klaas',
      prefix: 'van',
      lastname: 'Houten',
      callsign: 'Kansen-Klaas',
      telephone: '0612345678',
      emailaddress: 'klaas@example.com',
      gender: 'man',
      birthdate: '1985-03-15',
      initials: 'K.',
      createdAt: '2026-01-01T10:00:00',
      createdBy: 'user-1',
      modifiedAt: '2026-01-01T10:00:00',
      modifiedBy: 'user-1',
      tenantOrganization: 'org-1',
    },
    {
      bookerId: '2',
      status: 'active',
      firstname: 'Annemiek',
      prefix: '',
      lastname: 'Bakker',
      callsign: 'Annemiek',
      telephone: '0623456789',
      emailaddress: 'annemiek@example.com',
      gender: 'vrouw',
      birthdate: '1990-11-22',
      initials: 'A.',
      createdAt: '2026-01-01T10:00:00',
      createdBy: 'user-1',
      modifiedAt: '2026-01-01T10:00:00',
      modifiedBy: 'user-1',
      tenantOrganization: 'org-1',
    },
  ];

  beforeEach(async () => {
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['getAll', 'delete']);
    // Standaard: getAll() returnt onze mock data
    bookerServiceSpy.getAll.and.returnValue(of(mockBookers));

    // booker-list laadt via forkJoin ook bookings (voor de klik-navigatie)
    // en maakt via create() een nieuwe boeking voor een booker.
    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getAll', 'create']);
    bookingServiceSpy.getAll.and.returnValue(of([]));

    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      // imports: de component zelf (standalone components importeer je hier)
      imports: [
        BookerListComponent,
        // NoopAnimationsModule: schakelt Angular Material animaties uit
        // Zonder dit falen tests omdat animaties async zijn
        NoopAnimationsModule,
      ],
      providers: [
        { provide: BookerService, useValue: bookerServiceSpy },
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookerListComponent);
    component = fixture.componentInstance;
  });

  // =================================================================
  // TEST 1: Component wordt aangemaakt
  // =================================================================
  it('should create', () => {
    // Basale sanity check: kan de component worden aangemaakt?
    expect(component).toBeTruthy();
  });

  // =================================================================
  // TEST 2: Data wordt geladen bij init
  // =================================================================
  it('should load bookers on init', fakeAsync(() => {
    // fakeAsync() geeft ons controle over de tijd.
    // De component gebruikt setTimeout() om paginator te koppelen,
    // dus moeten we die "tijd" handmatig laten verstrijken.

    // detectChanges() triggert ngOnInit() (eerste keer)
    fixture.detectChanges();

    // tick() laat alle setTimeout()/setInterval() callbacks uitvoeren
    tick();

    // Verifieer: service is aangeroepen
    expect(bookerServiceSpy.getAll).toHaveBeenCalled();

    // Verifieer: data is in de tabel geladen
    expect(component.dataSource.data.length).toBe(2);

    // Verifieer: loading is false
    expect(component.loading()).toBe(false);
  }));

  // =================================================================
  // TEST 2b: Prospects worden niet onder de boekers getoond
  // =================================================================
  it('should exclude prospects from the booker list', fakeAsync(() => {
    const prospect: Booker = { ...mockBookers[0], bookerId: '3', status: 'prospect' };
    bookerServiceSpy.getAll.and.returnValue(of([...mockBookers, prospect]));

    fixture.detectChanges();
    tick();

    // alleen de 2 active bookers, de prospect is eruit gefilterd
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data.some(b => b.status === 'prospect')).toBe(false);
  }));

  // =================================================================
  // TEST 2c: Nieuwe boeking voor een booker → navigeer naar concept-scherm
  // =================================================================
  it('createBookingForBooker() should navigate to the concept screen with the bookerId', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.createBookingForBooker(mockBookers[0]);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/bookings', 'new'], { queryParams: { bookerId: '1' } });
  }));

  // =================================================================
  // TEST 2d: Waarschuwing als de booker al een lopende boeking heeft
  // =================================================================
  it('createBookingForBooker() should warn (and stop on cancel) for a booker with an ongoing booking', async () => {
    // booker '1' heeft een niet-afgeronde boeking
    const ongoing = { bookingId: 'bk-1', bookerId: '1', bookingStatus: 'boeking' } as unknown as Booking;
    (component as unknown as { allBookings: Booking[] }).allBookings = [ongoing];
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(false));

    await component.createBookingForBooker(mockBookers[0]);

    expect(confirmServiceSpy.confirm).toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  // =================================================================
  // TEST 3: Booker-namen verschijnen in de DOM
  // =================================================================
  it('should render booker names in the table', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // detectChanges() opnieuw → render de tabel met data
    fixture.detectChanges();

    // Zoek in de DOM naar de tabel-inhoud
    const tableElement: HTMLElement = fixture.nativeElement;
    const rows = tableElement.querySelectorAll('tr.mat-mdc-row');

    // We verwachten 2 rijen (1 per booker)
    expect(rows.length).toBe(2);

    // Eerste rij moet "Klaas" bevatten
    expect(rows[0].textContent).toContain('Klaas');
    expect(rows[0].textContent).toContain('van');
    expect(rows[0].textContent).toContain('Houten');

    // Tweede rij moet "Annemiek" bevatten
    expect(rows[1].textContent).toContain('Annemiek');
  }));

  // =================================================================
  // TEST 4: Filter werkt correct
  // =================================================================
  it('should filter bookers by name', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Simuleer een keyup event op het filter-veld
    // We maken een fake Event object dat eruitziet als een input event
    const filterEvent = {
      target: { value: 'klaas' } as HTMLInputElement,
    } as unknown as Event;

    component.applyFilter(filterEvent);
    fixture.detectChanges();

    // Na filteren zou alleen "Klaas" zichtbaar moeten zijn
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].firstname).toBe('Klaas');
  }));

  // =================================================================
  // TEST 5: Filter op e-mail werkt ook
  // =================================================================
  it('should filter bookers by email', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const filterEvent = {
      target: { value: 'annemiek@' } as HTMLInputElement,
    } as unknown as Event;

    component.applyFilter(filterEvent);

    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].firstname).toBe('Annemiek');
  }));

  // =================================================================
  // TEST 6: Error handling — loading stopt ook bij een fout
  // =================================================================
  it('should stop loading when service returns an error', fakeAsync(() => {
    // Overschrijf de spy: laat getAll() een error gooien
    bookerServiceSpy.getAll.and.returnValue(
      throwError(() => new Error('Server error'))
    );

    // Maak een verse component (die ngOnInit opnieuw aanroept)
    fixture = TestBed.createComponent(BookerListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    tick();

    // Loading moet false zijn, ook bij een error
    expect(component.loading()).toBe(false);

    // DataSource moet leeg zijn
    expect(component.dataSource.data.length).toBe(0);
  }));

  // =================================================================
  // Actie-iconen per regel (inzien / bewerken / verwijderen); geen regelklik meer
  // =================================================================
  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);

    function withData() {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }

    it('toont per regel de drie iconen als alle authorities er zijn', fakeAsync(() => {
      withData();

      const rows = mockBookers.filter(b => b.status !== 'prospect').length;
      expect(buttons('action-view').length).toBe(rows);
      expect(buttons('action-edit').length).toBe(rows);
      expect(buttons('action-delete').length).toBe(rows);
    }));

    it('toont een icoon alleen met de bijbehorende authority (BOOKING_READ/UPDATE/DELETE)', fakeAsync(() => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'BOOKING_READ');
      fixture = TestBed.createComponent(BookerListComponent);
      component = fixture.componentInstance;
      withData();

      expect(buttons('action-view').length).toBeGreaterThan(0);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
      expect(buttons('action-new-booking').length).toBe(0);
    }));

    it('de regel zelf is niet klikbaar meer', fakeAsync(() => {
      withData();
      expect(fixture.nativeElement.querySelector('.clickable-row')).toBeNull();

      (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));

    it('inzien opent het booker-dialoog alleen-lezen', fakeAsync(() => {
      withData();
      const open = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open');

      component.viewBooker(mockBookers[0]);

      const config = open.calls.mostRecent().args[1] as { data: { booker: Booker; readOnly: boolean } };
      expect(config.data.readOnly).toBe(true);
      expect(config.data.booker).toBe(mockBookers[0]);
    }));

    it('bewerken opent het dialoog bewerkbaar en laadt de lijst opnieuw na opslaan', fakeAsync(() => {
      withData();
      const open = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
        .and.returnValue({ afterClosed: () => of(true) } as never);
      bookerServiceSpy.getAll.calls.reset();

      component.editBooker(mockBookers[0]);
      tick();

      const config = open.calls.mostRecent().args[1] as { data: { readOnly: boolean } };
      expect(config.data.readOnly).toBe(false);
      expect(bookerServiceSpy.getAll).toHaveBeenCalledTimes(1);
    }));

    it('bewerken zonder opslaan (annuleren) laadt niets opnieuw', fakeAsync(() => {
      withData();
      spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
        .and.returnValue({ afterClosed: () => of(undefined) } as never);
      bookerServiceSpy.getAll.calls.reset();

      component.editBooker(mockBookers[0]);
      tick();

      expect(bookerServiceSpy.getAll).not.toHaveBeenCalled();
    }));

    it('verwijderen vraagt eerst bevestiging en haalt de regel daarna uit de lijst', fakeAsync(() => {
      withData();
      confirmServiceSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      bookerServiceSpy.delete.and.returnValue(of(void 0));
      const before = component.dataSource.data.length;

      component.deleteBooker(mockBookers[0]);
      tick();

      expect(confirmServiceSpy.confirmDelete).toHaveBeenCalled();
      expect(bookerServiceSpy.delete).toHaveBeenCalledWith(mockBookers[0].bookerId);
      expect(component.dataSource.data.length).toBe(before - 1);
    }));

    it('verwijderen doet niets als de bevestiging wordt geweigerd', fakeAsync(() => {
      withData();
      confirmServiceSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteBooker(mockBookers[0]);
      tick();

      expect(bookerServiceSpy.delete).not.toHaveBeenCalled();
    }));

    it('verwijderen laat de regel staan en meldt een fout als de server weigert', fakeAsync(() => {
      withData();
      const snack = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
      confirmServiceSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      bookerServiceSpy.delete.and.returnValue(throwError(() => new Error('nee')));
      const before = component.dataSource.data.length;

      component.deleteBooker(mockBookers[0]);
      tick();

      expect(component.dataSource.data.length).toBe(before);
      expect(snack).toHaveBeenCalled();
    }));
  });
});
