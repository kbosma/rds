import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../admin/theme.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let themeSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['logout', 'hasAuthority', 'currentUser'], {
      currentUser: () => ({ accountId: 'u-1', organizationId: 'o-1', roles: ['ADMIN'], authorities: [] }),
    });
    themeSpy = jasmine.createSpyObj('ThemeService', ['loadAndApplyTheme']);

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: ThemeService, useValue: themeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the toolbar', () => {
    const toolbar = fixture.nativeElement.querySelector('mat-toolbar');
    expect(toolbar).toBeTruthy();
  });

  describe('organisatiethema', () => {
    const recreate = () => {
      themeSpy.loadAndApplyTheme.calls.reset();
      fixture = TestBed.createComponent(LayoutComponent);
      fixture.detectChanges();
    };

    it('wordt geladen met ORGANIZATION_THEME_READ', () => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'ORGANIZATION_THEME_READ');
      recreate();

      expect(themeSpy.loadAndApplyTheme).toHaveBeenCalledTimes(1);
    });

    it('wordt niet opgevraagd zonder ORGANIZATION_THEME_READ (de backend zou 403 geven)', () => {
      authSpy.hasAuthority.and.returnValue(false);
      recreate();

      expect(authSpy.hasAuthority).toHaveBeenCalledWith('ORGANIZATION_THEME_READ');
      expect(themeSpy.loadAndApplyTheme).not.toHaveBeenCalled();
    });
  });
});
