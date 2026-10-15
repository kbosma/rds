import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  TEMPLATE_IMAGE_MAX_BYTES,
  TEMPLATE_IMAGE_TYPES,
  TemplateImageService,
  templateImageAlt,
  templateImageErrorKey,
  templateImageProblemKey,
  isTemplateImageUrl,
  validateTemplateImage,
} from './template-image.service';
import { TemplateImage, TemplateImageItem } from '../models';

describe('validateTemplateImage', () => {
  it('accepts the allowed image types within the size limit', () => {
    TEMPLATE_IMAGE_TYPES.forEach(type => {
      expect(validateTemplateImage({ type, size: 1000 })).toBeNull();
    });
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateTemplateImage({ type: 'image/png', size: TEMPLATE_IMAGE_MAX_BYTES })).toBeNull();
  });

  it('rejects a file over the size limit', () => {
    expect(validateTemplateImage({ type: 'image/png', size: TEMPLATE_IMAGE_MAX_BYTES + 1 })).toBe('size');
  });

  it('rejects SVG (can contain scripts) and other non-raster types', () => {
    expect(validateTemplateImage({ type: 'image/svg+xml', size: 100 })).toBe('type');
    expect(validateTemplateImage({ type: 'application/pdf', size: 100 })).toBe('type');
    expect(validateTemplateImage({ type: 'text/html', size: 100 })).toBe('type');
    expect(validateTemplateImage({ type: '', size: 100 })).toBe('type');
  });

  it('reports the type problem before the size problem', () => {
    expect(validateTemplateImage({ type: 'image/svg+xml', size: TEMPLATE_IMAGE_MAX_BYTES + 1 })).toBe('type');
  });
});

describe('isTemplateImageUrl', () => {
  const id = '11111111-2222-3333-4444-555555555555';

  it('accepts only the public path of an uploaded image', () => {
    expect(isTemplateImageUrl(`/api/public/email-images/${id}`)).toBeTrue();
    expect(isTemplateImageUrl(`/api/public/email-images/${id.toUpperCase()}`)).toBeTrue();
  });

  it('rejects external URLs, other paths, extra path parts and non-strings', () => {
    expect(isTemplateImageUrl(`https://evil.example/api/public/email-images/${id}`)).toBeFalse();
    expect(isTemplateImageUrl(`//evil.example/api/public/email-images/${id}`)).toBeFalse();
    expect(isTemplateImageUrl(`/api/public/email-images/${id}/extra`)).toBeFalse();
    expect(isTemplateImageUrl(`/api/public/email-images/${id}?x=1`)).toBeFalse();
    expect(isTemplateImageUrl(`/api/public/email-images/${id}" onerror="alert(1)`)).toBeFalse();
    expect(isTemplateImageUrl('/api/public/email-images/not-a-uuid')).toBeFalse();
    expect(isTemplateImageUrl('javascript:alert(1)')).toBeFalse();
    expect(isTemplateImageUrl('')).toBeFalse();
    expect(isTemplateImageUrl(null)).toBeFalse();
    expect(isTemplateImageUrl(undefined)).toBeFalse();
    expect(isTemplateImageUrl({ toString: () => `/api/public/email-images/${id}` })).toBeFalse();
  });
});

describe('email image helpers', () => {
  it('templateImageAlt strips only the extension', () => {
    expect(templateImageAlt('mijn-logo.png')).toBe('mijn-logo');
    expect(templateImageAlt('foto.van.de.zomer.jpeg')).toBe('foto.van.de.zomer');
    expect(templateImageAlt('zonder-extensie')).toBe('zonder-extensie');
    expect(templateImageAlt(null)).toBe('');
    expect(templateImageAlt(undefined)).toBe('');
  });

  it('templateImageErrorKey maps the HTTP status to a translated message key', () => {
    expect(templateImageErrorKey({ status: 413 })).toBe('templateEditor.imageTooLarge');
    expect(templateImageErrorKey({ status: 400 })).toBe('templateEditor.imageInvalidType');
    expect(templateImageErrorKey({ status: 500 })).toBe('templateEditor.imageUploadError');
    expect(templateImageErrorKey({})).toBe('templateEditor.imageUploadError');
  });

  it('templateImageProblemKey maps the validation problem to a message key', () => {
    expect(templateImageProblemKey('type')).toBe('templateEditor.imageInvalidType');
    expect(templateImageProblemKey('size')).toBe('templateEditor.imageTooLarge');
  });
});

describe('TemplateImageService', () => {
  let service: TemplateImageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TemplateImageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('upload() POSTs the file as multipart/form-data under the "file" part', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', { type: 'image/png' });
    const created: TemplateImage = {
      emailImageId: 'img-1', url: '/api/public/email-images/img-1',
      originalFilename: 'logo.png', contentType: 'image/png', sizeBytes: 3,
    };
    let actual: TemplateImage | undefined;

    service.upload(file).subscribe(result => (actual = result));

    const req = httpMock.expectOne('/api/email-images');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    const sent = (req.request.body as FormData).get('file') as File;
    expect(sent.name).toBe('logo.png');
    expect(sent.size).toBe(3);
    req.flush(created);

    expect(actual).toEqual(created);
  });

  it('list() GETs the library', () => {
    const items: TemplateImageItem[] = [{
      emailImageId: 'img-1', url: '/api/public/email-images/img-1', originalFilename: 'a.png',
      contentType: 'image/png', sizeBytes: 3, createdAt: '2026-10-13T12:00:00', inUse: false,
    }];
    let actual: TemplateImageItem[] | undefined;

    service.list().subscribe(result => (actual = result));

    const req = httpMock.expectOne('/api/email-images');
    expect(req.request.method).toBe('GET');
    req.flush(items);
    expect(actual).toEqual(items);
  });

  it('delete() DELETEs the image by id', () => {
    service.delete('img-1').subscribe();

    const req = httpMock.expectOne('/api/email-images/img-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
