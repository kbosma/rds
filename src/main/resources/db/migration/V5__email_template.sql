-- E-mailtemplates (HTML) voor o.a. het aanmeldproces van potentiële bookers.
-- Zelfde patroon als document_template, maar met een subject en HTML-body (tekst
-- i.p.v. bytea). De body wordt met FreeMarker gemerged met persoon-data.

CREATE TABLE email_template (
    email_template_id   UUID PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         VARCHAR(255),
    subject             VARCHAR(255) NOT NULL,
    body_html           TEXT,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);
