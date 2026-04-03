import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { BookerListComponent } from './booker-list.component';
import { BookerService } from './booker.service';
import { Booker } from '../../shared/models';

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

  // Testdata — 2 bookers zodat we filter-logica kunnen testen
  const mockBookers: Booker[] = [
    {
      bookerId: '1',
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
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['getAll']);
    // Standaard: getAll() returnt onze mock data
    bookerServiceSpy.getAll.and.returnValue(of(mockBookers));

    await TestBed.configureTestingModule({
      // imports: de component zelf (standalone components importeer je hier)
      imports: [
        BookerListComponent,
        // NoopAnimationsModule: schakelt Angular Material animaties uit
        // Zonder dit falen tests omdat animaties async zijn
        NoopAnimationsModule,
      ],
      providers: [{ provide: BookerService, useValue: bookerServiceSpy }],
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
});