-- Fase 0 van docs/voorstel-eigen-rollen.md: naamgeving en auditvelden gelijktrekken.
--
-- 1. person, organization_settings en organization_theme heten voortaan tenant_organization (net als alle andere
--    tenant-tabellen). Deze tabellen horen bij de organisatie zelf: verwijderen van een (lege) organisatie neemt ze
--    mee (ON DELETE CASCADE, zoals voorheen). Bedrijfsgegevens houden ON DELETE RESTRICT (V21).
-- 2. account krijgt een eigen tenant_organization, altijd gelijk aan die van de persoon (samengestelde foreign key).
-- 3. Auditvelden voor role, role_authority en de koppeltabellen.

-- 1. organization_id -> tenant_organization ---------------------------------------------------------------------

ALTER TABLE person RENAME COLUMN organization_id TO tenant_organization;
ALTER TABLE person RENAME CONSTRAINT person_organization_id_fkey TO fk_person_tenant_organization;
CREATE INDEX idx_person_tenant_organization ON person (tenant_organization);

ALTER TABLE organization_settings RENAME COLUMN organization_id TO tenant_organization;
ALTER TABLE organization_settings RENAME CONSTRAINT organization_settings_organization_id_fkey TO fk_organization_settings_tenant_organization;
ALTER TABLE organization_settings RENAME CONSTRAINT organization_settings_organization_id_key TO uq_organization_settings_tenant_organization;

ALTER TABLE organization_theme RENAME COLUMN organization_id TO tenant_organization;
ALTER TABLE organization_theme RENAME CONSTRAINT organization_theme_organization_id_fkey TO fk_organization_theme_tenant_organization;
ALTER TABLE organization_theme RENAME CONSTRAINT organization_theme_organization_id_key TO uq_organization_theme_tenant_organization;

-- 2. account.tenant_organization ------------------------------------------------------------------------------------

-- Doel voor de samengestelde foreign key: een account hoort bij dezelfde organisatie als zijn persoon.
ALTER TABLE person ADD CONSTRAINT uq_person_tenant_organization UNIQUE (person_id, tenant_organization);

ALTER TABLE account ADD COLUMN tenant_organization UUID;
UPDATE account a SET tenant_organization = p.tenant_organization FROM person p WHERE p.person_id = a.person_id;
ALTER TABLE account ALTER COLUMN tenant_organization SET NOT NULL;

ALTER TABLE account ADD CONSTRAINT fk_account_tenant_organization
    FOREIGN KEY (tenant_organization) REFERENCES organization (organization_id) ON DELETE CASCADE;
-- Verhuist een persoon naar een andere organisatie, dan verhuizen zijn accounts mee (ON UPDATE CASCADE).
ALTER TABLE account ADD CONSTRAINT fk_account_person_tenant_organization
    FOREIGN KEY (person_id, tenant_organization) REFERENCES person (person_id, tenant_organization)
        ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX idx_account_tenant_organization ON account (tenant_organization);

-- 3. Auditvelden ------------------------------------------------------------------------------------------------------

-- role: wordt straks klantgegevens (eigen rollen), dus volledige audit.
ALTER TABLE role
    ADD COLUMN created_at  TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by  UUID,
    ADD COLUMN modified_at TIMESTAMP,
    ADD COLUMN modified_by UUID;

-- Koppelingen wijzigen nooit (ze worden verwijderd en opnieuw gemaakt): alleen wie ze wanneer maakte.
ALTER TABLE role_authority
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
ALTER TABLE accommodation_address
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
ALTER TABLE accommodation_supplier
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
ALTER TABLE booker_address
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
ALTER TABLE supplier_address
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
ALTER TABLE booking_mollie_payment
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT now(),
    ADD COLUMN created_by UUID;
