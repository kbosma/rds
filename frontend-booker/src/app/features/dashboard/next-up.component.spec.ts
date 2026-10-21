import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NOW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { NextUpComponent } from './next-up.component';

describe('NextUpComponent', () => {
  function setup(now: Date = NOW, service = portalServiceSpy()) {
    const s = storeSetup(now, service);
    TestBed.configureTestingModule({ imports: [NextUpComponent], providers: s.providers });
    TestBed.inject(PortalStore).init();
    const fixture = TestBed.createComponent(NextUpComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, service };
  }
  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');

  it('toont tijdens een activiteit "nu", wat daarna komt en wat daarna', () => {
    const { el } = setup();

    expect(text(el)).toContain('Nu en straks');
    expect(text(el)).toContain('Nu');
    expect(text(el)).toContain('Eilandhoppen Pakleni');
    expect(text(el)).toContain('10:00 – 16:00');
    expect(text(el)).toContain('Haven Hvar');
    expect(text(el)).toContain('Hierna');
    expect(text(el)).toContain('Check-out Hotel Hvar Bay');
    expect(text(el)).toContain('Daarna:');
    expect(text(el)).toContain('Transfer luchthaven');
  });

  it('toont voor de reis het eerste verblijf en over hoeveel dagen', () => {
    const { el } = setup(new Date(2027, 5, 1, 9, 0));

    expect(text(el)).toContain('Wat komt eraan');
    expect(text(el)).toContain('Eerstvolgende');
    expect(text(el)).toContain('Check-in Villa Marina');
    expect(text(el)).toContain('zaterdag 12 juni');
    expect(text(el)).toContain('Adria Stays');
    expect(text(el)).toContain('Over 11 dagen');
    expect(text(el)).toContain('Kajaktour Split');
  });

  it('zegt "over 1 dag" bij één dag', () => {
    const { el } = setup(new Date(2027, 5, 11, 9, 0));

    expect(text(el)).toContain('Over 1 dag');
  });

  it('bedankt na de reis', () => {
    const { el } = setup(new Date(2027, 6, 5));

    expect(text(el)).toContain('Fijn dat u met ons op reis was');
  });

  it('meldt dat er nog niets gepland is', () => {
    const service = portalServiceSpy();
    service.getStays.and.returnValue(of([]));
    service.getActivities.and.returnValue(of([]));
    const { el } = setup(new Date(2027, 5, 1, 9, 0), service);

    expect(text(el)).toContain('nog geen onderdelen gepland');
  });
});
