import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { TemplateImageLibraryComponent } from './template-image-library.component';
import { TemplateImageService, TEMPLATE_IMAGE_MAX_BYTES } from './template-image.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../services/confirm.service';
import { TemplateImageItem } from '../models';

/*
 * De bibliotheek toont de afbeeldingen van de organisatie, laat ze de editor in slepen of
 * aanklikken, en verwijdert ze alleen als dat veilig kan (niet in gebruik, niet in de
 * tekst die nu bewerkt wordt). Verstuurde mails kunnen we niet controleren: de bevestiging
 * waarschuwt daarvoor.
 */
describe('TemplateImageLibraryComponent', () => {
  let fixture: ComponentFixture<TemplateImageLibraryComponent>;
  let component: TemplateImageLibraryComponent;
  let imageServiceSpy: jasmine.SpyObj<TemplateImageService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let snackBarOpenSpy: jasmine.Spy;

  const free: TemplateImageItem = {
    emailImageId: 'img-1', url: '/api/public/email-images/11111111-1111-1111-1111-111111111111',
    originalFilename: 'mijn-logo.png', contentType: 'image/png', sizeBytes: 2048,
    createdAt: '2026-10-13T12:00:00', inUse: false,
  };
  const used: TemplateImageItem = {
    ...free, emailImageId: 'img-2', originalFilename: 'banner.png', inUse: true,
    url: '/api/public/email-images/22222222-2222-2222-2222-222222222222',
  };

  async function setup(options: { canDelete?: boolean; list?: TemplateImageItem[] } = {}) {
    imageServiceSpy = jasmine.createSpyObj('TemplateImageService', ['list', 'upload', 'delete']);
    imageServiceSpy.list.and.returnValue(of(options.list ?? [free, used]));
    imageServiceSpy.delete.and.returnValue(of(undefined));
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(options.canDelete ?? true);

    await TestBed.configureTestingModule({
      imports: [TemplateImageLibraryComponent, NoopAnimationsModule],
      providers: [
        { provide: TemplateImageService, useValue: imageServiceSpy },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateImageLibraryComponent);
    component = fixture.componentInstance;
    // MatSnackBar komt uit de module-providers van de component zelf; spioneer op die instance.
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const tiles = () => Array.from(el().querySelectorAll<HTMLElement>('.tile'));
  const deleteButtons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.tile .del'));
  const lastMessage = () => snackBarOpenSpy.calls.mostRecent().args[0] as string;

  it('loads the library on init and shows a tile per image', async () => {
    await setup();

    expect(imageServiceSpy.list).toHaveBeenCalledTimes(1);
    expect(tiles().length).toBe(2);
    expect(tiles()[0].querySelector('.name')?.textContent).toContain('mijn-logo.png');
    expect(tiles()[0].querySelector('img')?.getAttribute('src')).toBe(free.url);
  });

  it('shows an empty message when there are no images', async () => {
    await setup({ list: [] });

    expect(tiles().length).toBe(0);
    expect(el().textContent).toContain('Nog geen afbeeldingen');
  });

  it('shows an error with a retry when loading fails, and retries', async () => {
    await setup();
    imageServiceSpy.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.reload();
    fixture.detectChanges();

    expect(component.loadFailed()).toBeTrue();
    expect(el().textContent).toContain('mislukt');

    imageServiceSpy.list.and.returnValue(of([free]));
    el().querySelector<HTMLButtonElement>('.empty button')!.click();
    fixture.detectChanges();

    expect(component.loadFailed()).toBeFalse();
    expect(tiles().length).toBe(1);
  });

  it('emits the image when a tile is clicked', async () => {
    await setup();
    const chosen: TemplateImageItem[] = [];
    component.imageChosen.subscribe(i => chosen.push(i));

    tiles()[0].click();

    expect(chosen).toEqual([free]);
  });

  it('puts the url and an extension-less alt text in the drag payload', async () => {
    await setup();
    const data: Record<string, string> = {};
    const dataTransfer = { setData: (k: string, v: string) => (data[k] = v), effectAllowed: '' } as unknown as DataTransfer;

    component.onDragStart({ dataTransfer } as DragEvent, free);

    expect(JSON.parse(data['application/x-rds-image'])).toEqual({ url: free.url, alt: 'mijn-logo' });
    expect(dataTransfer.effectAllowed).toBe('copy');
  });

  describe('verwijderen', () => {
    it('hides the delete buttons without the TEMPLATE_DELETE authority', async () => {
      await setup({ canDelete: false });

      expect(deleteButtons().length).toBe(0);
    });

    it('disables delete for an image that a template uses', async () => {
      await setup();

      expect(deleteButtons()[0].disabled).toBeFalse(); // vrij
      expect(deleteButtons()[1].disabled).toBeTrue();  // in gebruik
      expect(component.tooltip(used)).toContain('in gebruik in een template');
    });

    it('disables delete for an image that is in the text being edited (not yet saved)', async () => {
      await setup();
      fixture.componentRef.setInput('activeUrls', [free.url]);
      fixture.detectChanges();

      expect(deleteButtons()[0].disabled).toBeTrue();
      expect(component.tooltip(free)).toContain('tekst die je nu bewerkt');
    });

    it('does nothing for a locked image (no confirmation, no request)', async () => {
      await setup();

      await component.remove(used);

      expect(confirmSpy.confirmDelete).not.toHaveBeenCalled();
      expect(imageServiceSpy.delete).not.toHaveBeenCalled();
    });

    it('asks for confirmation (warning about sent mails) and does not delete when cancelled', async () => {
      await setup();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      await component.remove(free);

      const message = confirmSpy.confirmDelete.calls.mostRecent().args[0];
      expect(message).toContain('mijn-logo.png');
      expect(message).toContain('al verstuurd');
      expect(imageServiceSpy.delete).not.toHaveBeenCalled();
      expect(component.images().length).toBe(2);
    });

    it('deletes after confirmation and removes the image from the list', async () => {
      await setup();

      await component.remove(free);

      expect(imageServiceSpy.delete).toHaveBeenCalledWith('img-1');
      expect(component.images().map(i => i.emailImageId)).toEqual(['img-2']);
      expect(lastMessage()).toContain('verwijderd');
    });

    it('marks the image as in use when the server answers 409', async () => {
      await setup();
      imageServiceSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

      await component.remove(free);

      expect(component.images().find(i => i.emailImageId === 'img-1')?.inUse).toBeTrue();
      expect(lastMessage()).toContain('wordt nog gebruikt');
    });

    it('drops the image from the list when the server answers 404 (already gone)', async () => {
      await setup();
      imageServiceSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

      await component.remove(free);

      expect(component.images().map(i => i.emailImageId)).toEqual(['img-2']);
    });

    it('shows a generic error for other failures and keeps the image', async () => {
      await setup();
      imageServiceSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      await component.remove(free);

      expect(component.images().length).toBe(2);
      expect(lastMessage()).toContain('mislukt');
    });
  });

  describe('uploaden', () => {
    const pick = (file: File) =>
      component.onFileSelected({ target: { files: [file], value: 'x' } } as unknown as Event);

    it('uploads to the library (without inserting) and reloads the list', async () => {
      await setup();
      imageServiceSpy.upload.and.returnValue(of({ ...free }));

      pick(new File([new Uint8Array(10)], 'nieuw.png', { type: 'image/png' }));

      expect(imageServiceSpy.upload).toHaveBeenCalledTimes(1);
      expect(imageServiceSpy.list).toHaveBeenCalledTimes(2); // init + na upload
      expect(lastMessage()).toContain('geüpload');
      expect(component.uploading()).toBeFalse();
    });

    it('rejects an unsupported type and a too large file without uploading', async () => {
      await setup();

      pick(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }));
      expect(lastMessage()).toContain('PNG');
      pick(new File([new Uint8Array(TEMPLATE_IMAGE_MAX_BYTES + 1)], 'groot.png', { type: 'image/png' }));
      expect(lastMessage()).toContain('2 MB');

      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
    });

    it('shows a translated message when the server rejects the upload', async () => {
      await setup();
      imageServiceSpy.upload.and.returnValue(throwError(() =>
        new HttpErrorResponse({ status: 413, error: { message: 'The uploaded file is too large.' } })));

      pick(new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }));

      expect(lastMessage()).toContain('2 MB');
      expect(lastMessage()).not.toContain('The uploaded file');
      expect(component.uploading()).toBeFalse();
    });
  });
});
