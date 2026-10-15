import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TemplateImage, TemplateImageItem } from '../models';

/** Typen die de backend accepteert (zie ImageTypes). SVG staat er bewust niet tussen. */
export const TEMPLATE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Gelijk aan app.email.image.max-bytes in de backend (2 MB). */
export const TEMPLATE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Eigen drag-type voor een afbeelding uit de bibliotheek (net als bij de variabelen). */
export const TEMPLATE_IMAGE_DRAG_MIME = 'application/x-rds-image';

/**
 * Alleen dit pad is een toegestane afbeelding-bron in de editor: het publieke pad van een
 * geüploade afbeelding. Zo kan een gesleepte of geplakte (vervalste) payload geen willekeurige
 * externe URL als <img src> in een template zetten.
 */
const TEMPLATE_IMAGE_URL_PATTERN = /^\/api\/public\/email-images\/[0-9a-f-]{36}$/i;

export function isTemplateImageUrl(url: unknown): url is string {
  return typeof url === 'string' && TEMPLATE_IMAGE_URL_PATTERN.test(url);
}

export type TemplateImageProblem = 'type' | 'size';

/**
 * Snelle controle vóór het uploaden, zodat de gebruiker direct feedback krijgt.
 * De backend blijft leidend: die bepaalt het type uit de bytes zelf.
 */
export function validateTemplateImage(file: Pick<File, 'type' | 'size'>): TemplateImageProblem | null {
  if (!TEMPLATE_IMAGE_TYPES.includes(file.type)) return 'type';
  if (file.size > TEMPLATE_IMAGE_MAX_BYTES) return 'size';
  return null;
}

/** Vertaalsleutel voor een mislukte validatie vóór het uploaden. */
export function templateImageProblemKey(problem: TemplateImageProblem): string {
  return problem === 'type' ? 'templateEditor.imageInvalidType' : 'templateEditor.imageTooLarge';
}

/**
 * Vertaalsleutel voor een mislukte upload, per HTTP-status. De (Engelstalige) servertekst
 * tonen we bewust niet: de UI is vertaald.
 */
export function templateImageErrorKey(error: { status?: number }): string {
  if (error.status === 413) return 'templateEditor.imageTooLarge';
  if (error.status === 400) return 'templateEditor.imageInvalidType';
  return 'templateEditor.imageUploadError';
}

/** De bestandsnaam zonder extensie: een bruikbare alt-tekst (zichtbaar als een mailclient plaatjes blokkeert). */
export function templateImageAlt(filename: string | null | undefined): string {
  return (filename ?? '').replace(/\.[^.]+$/, '');
}

@Injectable({ providedIn: 'root' })
export class TemplateImageService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/email-images`;

  /** Uploadt een afbeelding (multipart) en geeft het publieke pad terug. */
  upload(file: File) {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<TemplateImage>(this.url, body);
  }

  /** De bibliotheek van de eigen organisatie (zonder bytes), nieuwste eerst. */
  list() {
    return this.http.get<TemplateImageItem[]>(this.url);
  }

  /** Verwijdert een afbeelding; 409 als een template hem nog gebruikt. */
  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
