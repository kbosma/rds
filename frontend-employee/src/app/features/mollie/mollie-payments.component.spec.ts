import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MolliePaymentsComponent } from './mollie-payments.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment } from '../../shared/models';

describe('MolliePaymentsComponent', () => {
  let component: MolliePaymentsComponent;
  let fixture: ComponentFixture<MolliePaymentsComponent>;
  let serviceSpy: jasmine.SpyObj<MolliePaymentService>;

  const mockPayments: MolliePayment[] = [
    {
      molliePaymentId: 'mp-1', molliePaymentExternalId: 'tr_001', status: 'paid',
      method: 'ideal', amount: 2450, currency: 'EUR', description: 'Betaling 1',
      checkoutUrl: '', createdAt: '2026-04-11T10:00:00', createdBy: 'u-1',
      modifiedAt: '2026-04-11T10:00:00', modifiedBy: 'u-1', tenantOrganization: 'o-1',
    },
    {
      molliePaymentId: 'mp-2', molliePaymentExternalId: 'tr_002', status: 'open',
      method: null, amount: 1875.50, currency: 'EUR', description: 'Betaling 2',
      checkoutUrl: 'https://checkout', createdAt: '2026-04-16T09:00:00', createdBy: 'u-1',
      modifiedAt: '2026-04-16T09:00:00', modifiedBy: 'u-1', tenantOrganization: 'o-1',
    },
  ];

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('MolliePaymentService', ['getAll']);
    serviceSpy.getAll.and.returnValue(of(mockPayments));

    await TestBed.configureTestingModule({
      imports: [MolliePaymentsComponent, NoopAnimationsModule],
      providers: [
        { provide: MolliePaymentService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b-1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MolliePaymentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load payments and calculate amounts on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.payments().length).toBe(2);
    expect(component.totalAmount()).toBe(4325.50);
    expect(component.paidAmount()).toBe(2450);
    expect(component.openAmount()).toBe(1875.50);
    expect(component.loading()).toBe(false);
  }));

  it('should render payment rows in the table', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('tr_001');
    expect(rows[0].textContent).toContain('Betaling 1');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(MolliePaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
    expect(component.payments().length).toBe(0);
  }));
});