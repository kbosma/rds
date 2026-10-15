-- Afbeeldingen voor in e-mailtemplates (HTML). Opgeslagen in de database (zelfde
-- aanpak als document_template.template_data), zodat er geen aparte bestandsopslag
-- beheerd hoeft te worden. Een afbeelding is onveranderlijk: nieuwe versie = nieuwe rij.
--
-- De afbeelding wordt publiek (zonder login) uitgeleverd op basis van de onraadbare
-- UUID, omdat de mailclient van de ontvanger geen JWT heeft. tenant_organization
-- legt vast bij welke organisatie de afbeelding hoort (herkomst/opruimen); het
-- publieke GET-endpoint filtert er bewust niet op.

CREATE TABLE email_image (
    email_image_id      UUID PRIMARY KEY,
    original_filename   VARCHAR(255),
    content_type        VARCHAR(100) NOT NULL,
    size_bytes          BIGINT       NOT NULL,
    data                BYTEA        NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    tenant_organization UUID         NOT NULL
);

CREATE INDEX idx_email_image_tenant ON email_image (tenant_organization);
