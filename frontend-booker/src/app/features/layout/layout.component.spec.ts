import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookerAuthService } from '../../core/auth/booker-auth.service';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  function setup() {
    const auth = jasmine.createSpyObj<BookerAuthService>('BookerAuthService', ['logout']);
    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [provideRouter([]), { provide: BookerAuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, auth };
  }

  it('toont een balk met de titel, de taalkeuze en uitloggen', () => {
    const { el } = setup();

    expect(el.querySelector('.brand')?.textContent).toContain('RDS');
    expect(el.querySelector('.brand-sub')?.textContent).toContain('Boekingsportaal');
    expect(el.querySelector('app-language-switcher')).not.toBeNull();
    expect(el.querySelector('button[aria-label="Uitloggen"]')).not.toBeNull();
  });

  it('heeft geen tabbladen meer: alles staat op één pagina', () => {
    const { el } = setup();

    expect(el.querySelector('nav')).toBeNull();
    expect(el.querySelectorAll('a[routerLink]').length).toBe(0);
  });

  it('heeft één hoofdgebied voor de pagina', () => {
    const { el } = setup();

    expect(el.querySelectorAll('main').length).toBe(1);
    expect(el.querySelector('main router-outlet')).not.toBeNull();
  });

  it('logt de klant uit via de knop', () => {
    const { el, auth } = setup();

    (el.querySelector('button[aria-label="Uitloggen"]') as HTMLButtonElement).click();

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});
