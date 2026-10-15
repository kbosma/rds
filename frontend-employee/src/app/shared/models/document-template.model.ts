export interface DocumentTemplate {
  documentTemplateId: string;
  name: string;
  description: string;
  /** Alleen gevuld bij een template die in de editor is gemaakt; een geüploade .docx heeft dit niet. */
  sourceHtml?: string | null;
  tenantOrganization: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
}
