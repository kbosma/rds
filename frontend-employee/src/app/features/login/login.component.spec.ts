import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an invalid form when empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should have a valid form when filled', () => {
    component.loginForm.setValue({ userName: 'jan', password: 'pass123' });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should call AuthService.login and navigate on success', fakeAsync(() => {
    authSpy.login.and.returnValue(of({
      token: 'tok', accountId: 'a', organizationId: 'o', mustChangePassword: false,
    }));

    component.loginForm.setValue({ userName: 'jan', password: 'pass' });
    component.onLogin();
    tick();

    expect(authSpy.login).toHaveBeenCalledWith('jan', 'pass');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.loading()).toBe(false);
  }));

  it('should show error message on failed login', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({
      error: { message: 'Ongeldige credentials' },
    })));

    component.loginForm.setValue({ userName: 'jan', password: 'wrong' });
    component.onLogin();
    tick();

    expect(component.error()).toBe('Ongeldige credentials');
    expect(component.loading()).toBe(false);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it('should show default error when no message provided', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({})));

    component.loginForm.setValue({ userName: 'jan', password: 'wrong' });
    component.onLogin();
    tick();

    expect(component.error()).toBe('Controleer gebruikersnaam en wachtwoord');
  }));

  it('should render error banner in DOM when error exists', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({
      error: { message: 'Fout!' },
    })));

    component.loginForm.setValue({ userName: 'x', password: 'y' });
    component.onLogin();
    tick();
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Fout!');
  }));
});
