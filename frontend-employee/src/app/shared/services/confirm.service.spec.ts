import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfirmService } from './confirm.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';

/*
 * ConfirmService opent de ConfirmDialogComponent en vertaalt het resultaat naar
 * een boolean. We mocken MatDialog zodat we kunnen sturen wat de dialog "sluit"
 * en kunnen controleren met welke data hij geopend wordt.
 */
describe('ConfirmService', () => {
  let service: ConfirmService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  /** Laat de gemockte dialog sluiten met `result`. */
  function closeWith(result: unknown) {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(result) } as MatDialogRef<unknown>);
  }

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: dialogSpy }],
    });
    service = TestBed.inject(ConfirmService);
  });

  it('confirm() resolves true when the dialog closes with true', async () => {
    closeWith(true);
    expect(await service.confirm('Zeker?')).toBe(true);
  });

  it('confirm() resolves false when the dialog is dismissed (undefined)', async () => {
    closeWith(undefined);
    expect(await service.confirm('Zeker?')).toBe(false);
  });

  it('confirm() only treats an explicit true as confirmation', async () => {
    closeWith('yes');
    expect(await service.confirm('Zeker?')).toBe(false);
  });

  it('confirm() opens the ConfirmDialogComponent with the message', async () => {
    closeWith(true);

    await service.confirm('Zeker?');

    const [component, config] = dialogSpy.open.calls.mostRecent().args;
    expect(component).toBe(ConfirmDialogComponent);
    expect(config?.data).toEqual(jasmine.objectContaining({ message: 'Zeker?' }));
  });

  it('confirm() passes custom options through to the dialog data', async () => {
    closeWith(true);

    await service.confirm('Zeker?', { title: 'Let op', confirmLabel: 'Ja', confirmColor: 'warn' });

    const data = dialogSpy.open.calls.mostRecent().args[1]?.data;
    expect(data).toEqual(jasmine.objectContaining({
      message: 'Zeker?', title: 'Let op', confirmLabel: 'Ja', confirmColor: 'warn',
    }));
  });

  it('confirmDelete() asks with a warn-coloured "Verwijderen" button', async () => {
    closeWith(true);

    await service.confirmDelete('Weg ermee?');

    const data = dialogSpy.open.calls.mostRecent().args[1]?.data;
    expect(data).toEqual(jasmine.objectContaining({
      message: 'Weg ermee?', confirmLabel: 'Verwijderen', confirmColor: 'warn',
    }));
  });

  it('confirmDelete() resolves false when cancelled', async () => {
    closeWith(undefined);
    expect(await service.confirmDelete('Weg ermee?')).toBe(false);
  });
});
