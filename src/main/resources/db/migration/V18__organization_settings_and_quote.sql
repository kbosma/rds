-- Stap 2 van de automatische statussen: offerte versturen.
-- 1) Organisatie-instellingen: per organisatie één rij met de keuzes die het systeem nodig heeft
--    (nu: welke Word-template de offerte is en welke e-mailtemplate de offerte begeleidt; later ook betalingen).
--    Wordt een gekozen template verwijderd, dan vervalt alleen de keuze (ON DELETE SET NULL).
-- 2) Een verzonden e-mail kan één document als bijlage hebben (de offerte-PDF). Documenten worden nooit
--    verwijderd (V16), dus de verwijzing blijft geldig; RESTRICT als vangnet.
-- 3) Authorities: instellingen lezen/wijzigen en een offerte versturen.

CREATE TABLE organization_settings (
    organization_settings_id    UUID PRIMARY KEY,
    organization_id             UUID NOT NULL UNIQUE REFERENCES organization (organization_id) ON DELETE CASCADE,
    quote_document_template_id  UUID REFERENCES document_template (document_template_id) ON DELETE SET NULL,
    quote_email_template_id     UUID REFERENCES email_template (email_template_id) ON DELETE SET NULL,
    created_at                  TIMESTAMP NOT NULL,
    created_by                  UUID,
    modified_at                 TIMESTAMP,
    modified_by                 UUID
);

ALTER TABLE sent_email ADD COLUMN attachment_document_id UUID REFERENCES document (document_id) ON DELETE RESTRICT;

INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000064', 'ORGANIZATION_SETTINGS_READ'),
    ('d1000000-0000-0000-0000-000000000065', 'ORGANIZATION_SETTINGS_UPDATE'),
    ('d1000000-0000-0000-0000-000000000066', 'QUOTE_SEND');

-- MANAGER (...003) beheert de instellingen; EMPLOYEE (...002) mag ze lezen (om te zien of een offerte
-- verstuurd kan worden). Beiden mogen een offerte versturen. ADMIN is systeembeheer en krijgt deze niet.
INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000064'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000065'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000066'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000064'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000066');
