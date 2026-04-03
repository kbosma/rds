import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AccommodationListComponent } from './accommodation-list.component';
import { AccommodationService } from './accommodation.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AddressService } from './address.service';
import { SupplierAddressService } from './supplier-address.service';
import { SupplierService } from '../suppliers/supplier.service';

describe('AccommodationListComponent', () => {
  let component: AccommodationListComponent;
  let fixture: ComponentFixture<AccommodationListComponent>;

  const mockAccommodations = [
    { accommodationId: 'a-1', key: 'ACC-DUB-001', name: 'Dubrovnik Suite', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
    { accommodationId: 'a-2', key: 'ACC-SPL-001', name: 'Split Appartement', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockSuppliers = [
    { supplierId: 's-1', key: 'SUP-HR', name: 'Hotel Adriatic', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockAccSuppliers = [{ accommodationId: 'a-1', supplierId: 's-1' }];
  const mockAddresses = [
    { addressId: 'addr-1', street: 'Ulica Frana', housenumber: 5, housenumberAddition: null, postalcode: '20000', city: 'Dubrovnik', country: 'Kroatie', addressrole: 'accommodatie', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockAccAddresses = [{ accommodationId: 'a-1', addressId: 'addr-1' }];
  const mockSupAddresses = [{ supplierId: 's-1', addressId: 'addr-1' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccommodationListComponent, NoopAnimationsModule],
      providers: [
        { provide: AccommodationService, useValue: { getAll: () => of(mockAccommodations) } },
        { provide: AccommodationSupplierService, useValue: { getAll: () => of(mockAccSuppliers) } },
        { provide: SupplierService, useValue: { getAll: () => of(mockSuppliers) } },
        { provide: AccommodationAddressService, useValue: { getAll: () => of(mockAccAddresses) } },
        { provide: AddressService, useValue: { getAll: () => of(mockAddresses) } },
        { provide: SupplierAddressService, useValue: { getAll: () => of(mockSupAddresses) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccommodationListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and enrich accommodation data via forkJoin', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.allViews().length).toBe(2);
    expect(component.loading()).toBe(false);

    // Eerste accommodatie moet gekoppelde supplier hebben
    const dubrovnik = component.allViews().find(v => v.accommodation.accommodationId === 'a-1');
    expect(dubrovnik?.supplierName).toBe('Hotel Adriatic');
    expect(dubrovnik?.addressLine).toContain('Dubrovnik');

    // Tweede heeft geen koppeling
    const split = component.allViews().find(v => v.accommodation.accommodationId === 'a-2');
    expect(split?.supplierName).toBeNull();
  }));

  it('should filter by accommodation name', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const event = { target: { value: 'dubrovnik' } as HTMLInputElement } as unknown as Event;
    component.applyFilter(event);

    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].accommodation.name).toBe('Dubrovnik Suite');
  }));

  it('should filter by supplier name', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const event = { target: { value: 'adriatic' } as HTMLInputElement } as unknown as Event;
    component.applyFilter(event);

    expect(component.filtered().length).toBe(1);
  }));

  it('should reset filter on empty input', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // Eerst filteren
    component.applyFilter({ target: { value: 'dubrovnik' } as HTMLInputElement } as unknown as Event);
    expect(component.filtered().length).toBe(1);

    // Dan leeg maken
    component.applyFilter({ target: { value: '' } as HTMLInputElement } as unknown as Event);
    expect(component.filtered().length).toBe(2);
  }));

  it('should cycle accent colors', () => {
    expect(component.getAccentColor(0)).toBe('#1976d2');
    expect(component.getAccentColor(5)).toBe('#1976d2'); // wraps around
  });

  it('should handle forkJoin errors gracefully', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AccommodationListComponent, NoopAnimationsModule],
      providers: [
        { provide: AccommodationService, useValue: { getAll: () => throwError(() => new Error('fail')) } },
        { provide: AccommodationSupplierService, useValue: { getAll: () => of([]) } },
        { provide: SupplierService, useValue: { getAll: () => of([]) } },
        { provide: AccommodationAddressService, useValue: { getAll: () => of([]) } },
        { provide: AddressService, useValue: { getAll: () => of([]) } },
        { provide: SupplierAddressService, useValue: { getAll: () => of([]) } },
      ],
    });
    fixture = TestBed.createComponent(AccommodationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
    expect(component.allViews().length).toBe(0);
  }));
});
