import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

/*
 * ConfirmDialogComponent toont een boodschap met een annuleer- en een
 * bevestig-knop. We controleren de standaardteksten (uit de vertalingen), dat
 * overrides worden gerespecteerd, en welke knop met `true` sluit.
 */
describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  async function setup(data: ConfirmDialogData) {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el().querySelectorAll('button'));

  it('shows the message and the default title and labels', async () => {
    await setup({ message: 'Weet je het zeker?' });

    expect(el().querySelector('.confirm-message')?.textContent).toContain('Weet je het zeker?');
    expect(el().querySelector('h2')?.textContent).toContain('Bevestigen');
    expect(buttons().map(b => b.textContent?.trim())).toEqual(['Annuleren', 'Doorgaan']);
  });

  it('uses custom title and labels when provided', async () => {
    await setup({ message: 'Zeker?', title: 'Let op', confirmLabel: 'Ja', cancelLabel: 'Nee' });

    expect(el().querySelector('h2')?.textContent).toContain('Let op');
    expect(buttons().map(b => b.textContent?.trim())).toEqual(['Nee', 'Ja']);
  });

  it('closes with true when the confirm button is clicked', async () => {
    await setup({ message: 'Zeker?' });

    buttons()[1].click();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('does not close with true when the cancel button is clicked', async () => {
    await setup({ message: 'Zeker?' });

    buttons()[0].click();

    expect(dialogRefSpy.close).not.toHaveBeenCalledWith(true);
  });

  it('applies the warn colour to the confirm button when requested', async () => {
    await setup({ message: 'Weg ermee?', confirmColor: 'warn' });

    expect(buttons()[1].classList).toContain('mat-warn');
  });

  it('defaults the confirm button to the primary colour', async () => {
    await setup({ message: 'Zeker?' });

    expect(buttons()[1].classList).toContain('mat-primary');
  });
});
