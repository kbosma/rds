import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RowActionsComponent } from './row-actions.component';

/*
 * De actie-iconen van een lijstregel: elk icoon verschijnt alleen als het is toegestaan
 * (de aanroeper geeft dat door op basis van authorities) en geeft een eigen gebeurtenis.
 */
describe('RowActionsComponent', () => {
  let fixture: ComponentFixture<RowActionsComponent>;
  let component: RowActionsComponent;

  const button = (cls: string) => fixture.nativeElement.querySelector('button.' + cls) as HTMLButtonElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RowActionsComponent, NoopAnimationsModule] }).compileComponents();
    fixture = TestBed.createComponent(RowActionsComponent);
    component = fixture.componentInstance;
  });

  it('toont standaard geen enkel icoon', () => {
    fixture.detectChanges();

    expect(button('action-view')).toBeNull();
    expect(button('action-edit')).toBeNull();
    expect(button('action-delete')).toBeNull();
  });

  it('toont alleen de toegestane iconen', () => {
    fixture.componentRef.setInput('canView', true);
    fixture.componentRef.setInput('canDelete', true);
    fixture.detectChanges();

    expect(button('action-view')).not.toBeNull();
    expect(button('action-edit')).toBeNull();
    expect(button('action-delete')).not.toBeNull();
  });

  it('geeft per icoon de bijbehorende gebeurtenis', () => {
    fixture.componentRef.setInput('canView', true);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canDelete', true);
    const calls: string[] = [];
    component.view.subscribe(() => calls.push('view'));
    component.edit.subscribe(() => calls.push('edit'));
    component.remove.subscribe(() => calls.push('remove'));
    fixture.detectChanges();

    button('action-view')!.click();
    button('action-edit')!.click();
    button('action-delete')!.click();

    expect(calls).toEqual(['view', 'edit', 'remove']);
  });

  it('laat de klik niet doorlopen naar de regel eronder', () => {
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
    const parentClick = jasmine.createSpy('parentClick');
    fixture.nativeElement.addEventListener('click', parentClick);

    button('action-edit')!.click();

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('heeft toegankelijke labels (aria-label) op de iconen', () => {
    fixture.componentRef.setInput('canView', true);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canDelete', true);
    fixture.detectChanges();

    for (const cls of ['action-view', 'action-edit', 'action-delete']) {
      expect(button(cls)!.getAttribute('aria-label')).toBeTruthy();
    }
  });
});
