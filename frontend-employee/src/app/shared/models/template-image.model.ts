export interface TemplateImage {
  emailImageId: string;
  /** Relatief publiek pad, bv. /api/public/email-images/{id}; dit komt in de template-HTML. */
  url: string;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
}

/** Een afbeelding in de bibliotheek (lijst): met aanmaakdatum en of een template hem gebruikt. */
export interface TemplateImageItem extends TemplateImage {
  createdAt: string;
  /** True als een template de afbeelding gebruikt: dan mag hij niet verwijderd worden. */
  inUse: boolean;
}
