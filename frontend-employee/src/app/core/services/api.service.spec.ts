import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

/*
 * ====================================================================
 * WAT TESTEN WE HIER?
 * ====================================================================
 * ApiService is verantwoordelijk voor alle HTTP-communicatie.
 * We willen verifiëren dat:
 *   1. De juiste URL wordt aangeroepen
 *   2. De juiste HTTP-methode wordt gebruikt (GET, POST, PUT, DELETE)
 *   3. POST/PUT het juiste request body meestuurt
 *   4. De response correct wordt doorgegeven
 *
 * WAAROM HttpTestingController?
 * We willen geen echte HTTP-calls doen in tests. Angular biedt
 * HttpTestingController: hiermee onderscheppen we requests en
 * geven we zelf een fake response terug.
 * ====================================================================
 */

// Voorbeeld-interface om de generieke methodes te testen
interface TestItem {
  id: string;
  name: string;
}

describe('ApiService', () => {
  let service: ApiService;
  let httpTesting: HttpTestingController;

  // ---------------------------------------------------------------
  // beforeEach: wordt vóór ELKE test uitgevoerd.
  // Hier configureren we de Angular test-module.
  // ---------------------------------------------------------------
  beforeEach(() => {
    TestBed.configureTestingModule({
      // provideHttpClient()         → registreert HttpClient
      // provideHttpClientTesting()   → vervangt de echte HTTP-backend
      //                               door een fake die we kunnen controleren
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    // Haal instanties op uit de Angular dependency injection container
    service = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // ---------------------------------------------------------------
  // afterEach: wordt ná ELKE test uitgevoerd.
  // verify() controleert dat er geen onverwachte HTTP-calls zijn gedaan.
  // ---------------------------------------------------------------
  afterEach(() => {
    httpTesting.verify();
  });

  // =================================================================
  // TEST 1: getAll() — haalt een lijst op via GET
  // =================================================================
  it('getAll() should GET a list from the correct URL', () => {
    // De fake data die we als response teruggeven
    const mockBookers: TestItem[] = [
      { id: '1', name: 'Klaas' },
      { id: '2', name: 'Annemiek' },
    ];

    // Stap 1: Roep de service-methode aan en abonneer op het resultaat
    //         (niets gebeurt tot we subscribe() aanroepen — Observables zijn lazy)
    service.getAll<TestItem>('bookers').subscribe((result) => {
      // Stap 3: Verifieer dat het resultaat overeenkomt met onze mock
      expect(result).toEqual(mockBookers);
      expect(result.length).toBe(2);
    });

    // Stap 2: Onderschep de HTTP-request en geef een fake response
    //         expectOne() faalt als er 0 of >1 requests naar deze URL gaan
    const req = httpTesting.expectOne('/api/bookers');

    // Controleer dat het een GET request is (niet POST, PUT, etc.)
    expect(req.request.method).toBe('GET');

    // Geef de fake response terug → dit triggert de subscribe() callback hierboven
    req.flush(mockBookers);
  });

  // =================================================================
  // TEST 2: getById() — haalt één item op via GET /endpoint/{id}
  // =================================================================
  it('getById() should GET a single item with the id in the URL', () => {
    const mockBooker: TestItem = { id: 'abc-123', name: 'Klaas' };

    service.getById<TestItem>('bookers', 'abc-123').subscribe((result) => {
      expect(result).toEqual(mockBooker);
    });

    // Verifieer dat de id in de URL zit
    const req = httpTesting.expectOne('/api/bookers/abc-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockBooker);
  });

  // =================================================================
  // TEST 3: create() — maakt een nieuw item aan via POST
  // =================================================================
  it('create() should POST the body to the correct URL', () => {
    const newBooker = { name: 'Pieter' };
    const savedBooker: TestItem = { id: 'new-id', name: 'Pieter' };

    service.create<TestItem>('bookers', newBooker).subscribe((result) => {
      expect(result).toEqual(savedBooker);
    });

    const req = httpTesting.expectOne('/api/bookers');
    expect(req.request.method).toBe('POST');

    // Controleer dat het request body correct is meegestuurd
    expect(req.request.body).toEqual(newBooker);

    req.flush(savedBooker);
  });

  // =================================================================
  // TEST 4: update() — wijzigt een item via PUT /endpoint/{id}
  // =================================================================
  it('update() should PUT the body to the correct URL with id', () => {
    const updatedData = { name: 'Klaas Updated' };
    const updatedBooker: TestItem = { id: 'abc-123', name: 'Klaas Updated' };

    service
      .update<TestItem>('bookers', 'abc-123', updatedData)
      .subscribe((result) => {
        expect(result).toEqual(updatedBooker);
      });

    const req = httpTesting.expectOne('/api/bookers/abc-123');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedData);
    req.flush(updatedBooker);
  });

  // =================================================================
  // TEST 5: delete() — verwijdert een item via DELETE /endpoint/{id}
  // =================================================================
  it('delete() should send DELETE to the correct URL', () => {
    service.delete('bookers', 'abc-123').subscribe();

    const req = httpTesting.expectOne('/api/bookers/abc-123');
    expect(req.request.method).toBe('DELETE');

    // flush(null) → geen response body (204 No Content)
    req.flush(null);
  });
});