import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookerService } from './booker.service';
import { ApiService } from '../../core/services/api.service';
import { Booker } from '../../shared/models';

/*
 * ====================================================================
 * WAT TESTEN WE HIER?
 * ====================================================================
 * BookerService is een dunne laag bovenop ApiService.
 * We willen verifiëren dat:
 *   1. Het juiste endpoint ('bookers') wordt meegegeven
 *   2. Parameters (id, body) correct worden doorgestuurd
 *
 * WAAROM mocken we ApiService?
 * - ApiService is al apart getest (api.service.spec.ts)
 * - We willen BookerService in ISOLATIE testen
 * - Als ApiService een bug heeft, faalt ALLEEN de ApiService test
 *   en niet alle feature-service tests → makkelijker debuggen
 *
 * HOE mocken we?
 * - jasmine.createSpyObj() maakt een fake object met spy-methodes
 * - Een spy is een functie die bijhoudt hoe ze aangeroepen wordt
 *   (welke argumenten, hoe vaak, etc.)
 * - .and.returnValue(of(...)) laat de spy een Observable teruggeven
 * ====================================================================
 */

describe('BookerService', () => {
  let service: BookerService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  // Voorbeeld-data
  const mockBooker: Booker = {
    bookerId: 'abc-123',
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
  };

  beforeEach(() => {
    // Maak een spy-object dat eruitziet als ApiService
    // De array bevat de methode-namen die we willen mocken
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getAll',
      'getById',
      'create',
      'update',
      'delete',
    ]);

    TestBed.configureTestingModule({
      // Vervang de echte ApiService door onze spy
      // Wanneer BookerService nu ApiService injecteert, krijgt het de spy
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(BookerService);
  });

  // =================================================================
  // TEST 1: getAll() gebruikt het juiste endpoint
  // =================================================================
  it('getAll() should call ApiService.getAll with "bookers"', () => {
    // Configureer de spy: als getAll() wordt aangeroepen, return dan
    // een Observable met onze mock data.
    // of() is een RxJS functie die een Observable maakt die direct emit.
    apiSpy.getAll.and.returnValue(of([mockBooker]));

    service.getAll().subscribe((result) => {
      expect(result).toEqual([mockBooker]);
    });

    // Verifieer dat ApiService.getAll() is aangeroepen met 'bookers'
    expect(apiSpy.getAll).toHaveBeenCalledWith('bookers');

    // Verifieer dat het precies 1x is aangeroepen
    expect(apiSpy.getAll).toHaveBeenCalledTimes(1);
  });

  // =================================================================
  // TEST 2: getById() geeft het id correct door
  // =================================================================
  it('getById() should pass the id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mockBooker));

    service.getById('abc-123').subscribe((result) => {
      expect(result).toEqual(mockBooker);
    });

    // Verifieer: endpoint + id zijn correct doorgegeven
    expect(apiSpy.getById).toHaveBeenCalledWith('bookers', 'abc-123');
  });

  // =================================================================
  // TEST 3: create() stuurt het body correct door
  // =================================================================
  it('create() should pass the booker data to ApiService', () => {
    const newBooker: Partial<Booker> = {
      firstname: 'Pieter',
      lastname: 'de Groot',
    };
    apiSpy.create.and.returnValue(of(mockBooker));

    service.create(newBooker).subscribe();

    expect(apiSpy.create).toHaveBeenCalledWith('bookers', newBooker);
  });

  // =================================================================
  // TEST 4: update() stuurt id + body correct door
  // =================================================================
  it('update() should pass id and data to ApiService', () => {
    const changes: Partial<Booker> = { firstname: 'Klaas Updated' };
    apiSpy.update.and.returnValue(of(mockBooker));

    service.update('abc-123', changes).subscribe();

    expect(apiSpy.update).toHaveBeenCalledWith('bookers', 'abc-123', changes);
  });

  // =================================================================
  // TEST 5: delete() stuurt het id correct door
  // =================================================================
  it('delete() should pass the id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));

    service.delete('abc-123').subscribe();

    expect(apiSpy.delete).toHaveBeenCalledWith('bookers', 'abc-123');
  });
});