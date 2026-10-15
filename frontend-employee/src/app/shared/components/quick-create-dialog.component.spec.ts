import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QuickCreateDialogComponent } from './quick-create-dialog.component';

describe('QuickCreateDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<QuickCreateDialogComponent>>;

  function setup() {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [QuickCreateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { titleKey: 'accommodations.newTitle' } },
      ],
    });
    const fixture = TestBed.createComponent(QuickCreateDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('toont de vertaalde titel', () => {
    const { fixture } = setup();
    expect(fixture.nativeElement.textContent).toContain('Nieuwe accommodatie');
  });

  it('sluit met code en naam (opgeschoond)', () => {
    const { component } = setup();
    component.form.setValue({ name: '  Villa Sol ', key: ' ACC-9 ' });

    component.submit();

    expect(dialogRef.close).toHaveBeenCalledOnceWith({ key: 'ACC-9', name: 'Villa Sol' });
  });

  it('sluit niet zolang code of naam ontbreekt', () => {
    const { fixture, component } = setup();
    component.form.setValue({ name: 'Alleen naam', key: '' });
    fixture.detectChanges();

    component.submit();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect((fixture.nativeElement.querySelector('.create-btn') as HTMLButtonElement).disabled).toBeTrue();
  });
});
