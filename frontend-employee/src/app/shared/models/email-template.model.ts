export interface EmailTemplate {
  emailTemplateId: string;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}

export interface EmailRender {
  subject: string;
  bodyHtml: string;
}

export interface EmailSendResult {
  to: string;
  from: string;
  subject: string;
}
