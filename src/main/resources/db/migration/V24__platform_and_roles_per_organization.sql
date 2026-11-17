-- Fase 3 van docs/voorstel-eigen-rollen.md: platformorganisatie en rollen per organisatie.
--
-- - Eén platformorganisatie "RDS Platform" met de beheerders (ADMIN). Alle andere organisaties zijn klanten.
-- - Authorities liggen vast (alleen via Flyway). Systeemrollen liggen vast: hun inhoud staat in system_role_template;
--   elke organisatie heeft een vergrendelde kopie (ADMIN in het platform, MANAGER en EMPLOYEE bij elke klant).
-- - Elke rol en elke toewijzing (account_role) hoort bij precies één organisatie; de database dwingt af dat account en
--   rol bij dezelfde organisatie horen.
-- - Rechtenlogboek (authorization_log), alleen toevoegen.
--
-- Er is nog geen productie: de gegevens uit de seed (V2) worden hier rechtstreeks omgezet.

-- 1. Platformorganisatie -----------------------------------------------------------------------------------------

ALTER TABLE organization
    ADD COLUMN platform          BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN roles_reviewed_at TIMESTAMP;
CREATE UNIQUE INDEX uq_organization_platform ON organization (platform) WHERE platform;

INSERT INTO organization (organization_id, name, platform, created_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'RDS Platform', true, now());

CREATE FUNCTION prevent_platform_organization_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.platform THEN
        RAISE EXCEPTION 'De platformorganisatie kan niet worden verwijderd' USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
END $$;
CREATE TRIGGER trg_organization_platform_not_deletable
    BEFORE DELETE ON organization FOR EACH ROW EXECUTE FUNCTION prevent_platform_organization_delete();

-- 2. Authorities: vast, met domein, uitdeelbaarheid en introductiedatum ---------------------------------------------

-- Authorities worden niet meer via de API beheerd.
DELETE FROM authority WHERE description IN ('AUTHORITY_CREATE', 'AUTHORITY_UPDATE', 'AUTHORITY_DELETE');

ALTER TABLE authority
    ADD COLUMN domain            VARCHAR(50),
    ADD COLUMN tenant_assignable BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN introduced_at     DATE    NOT NULL DEFAULT DATE '2026-01-01';

UPDATE authority SET domain = regexp_replace(description, '_(CREATE|READ|UPDATE|DELETE)$', '');
UPDATE authority SET domain = 'BOOKING' WHERE description IN ('BOOKING_COMPLETE', 'BOOKING_STATUS_REVERT', 'BOOKING_STATUS_REVERT_PAID', 'QUOTE_SEND');
UPDATE authority SET domain = 'EMAIL'   WHERE description = 'EMAIL_SEND';
UPDATE authority SET domain = 'PAYMENT' WHERE description IN ('PAYMENT_CORRECT', 'PAYMENT_RELINK');
UPDATE authority SET domain = 'PERSON'  WHERE description = 'USER_SCOPE_ORGANIZATION';
UPDATE authority SET domain = 'PLATFORM' WHERE description = 'PLATFORM_ADMIN';
ALTER TABLE authority ALTER COLUMN domain SET NOT NULL;

-- Niet door een klant uit te delen: platformbeheer en de vaste rechten van het boekerportaal.
UPDATE authority SET tenant_assignable = false
WHERE description IN ('PLATFORM_ADMIN', 'ORGANIZATION_CREATE', 'ORGANIZATION_READ', 'ORGANIZATION_UPDATE',
                      'ORGANIZATION_DELETE', 'BOOKER_PORTAL_READ', 'BOOKER_PORTAL_UPDATE');

UPDATE authority SET introduced_at = DATE '2026-11-17' WHERE description IN ('PLATFORM_ADMIN', 'USER_SCOPE_ORGANIZATION');

-- 3. Afhankelijkheden tussen authorities ------------------------------------------------------------------------------

CREATE TABLE authority_requires (
    authority_id          UUID NOT NULL REFERENCES authority (authority_id) ON DELETE CASCADE,
    required_authority_id UUID NOT NULL REFERENCES authority (authority_id) ON DELETE CASCADE,
    PRIMARY KEY (authority_id, required_authority_id),
    CONSTRAINT chk_authority_requires_not_itself CHECK (authority_id <> required_authority_id)
);

-- Generiek: aanmaken, wijzigen en verwijderen vereisen lezen.
INSERT INTO authority_requires (authority_id, required_authority_id)
SELECT a.authority_id, r.authority_id
FROM authority a
JOIN authority r ON r.description = regexp_replace(a.description, '_(CREATE|UPDATE|DELETE)$', '_READ')
WHERE a.description ~ '_(CREATE|UPDATE|DELETE)$';

-- Specifiek.
INSERT INTO authority_requires (authority_id, required_authority_id)
SELECT a.authority_id, r.authority_id
FROM (VALUES
          ('QUOTE_SEND', 'BOOKING_READ'), ('QUOTE_SEND', 'DOCUMENT_CREATE'), ('QUOTE_SEND', 'EMAIL_SEND'), ('QUOTE_SEND', 'TEMPLATE_READ'),
          ('EMAIL_SEND', 'BOOKING_READ'),
          ('BOOKING_COMPLETE', 'BOOKING_READ'), ('BOOKING_STATUS_REVERT', 'BOOKING_READ'), ('BOOKING_STATUS_REVERT_PAID', 'BOOKING_STATUS_REVERT'),
          ('DOCUMENT_READ', 'BOOKING_READ'),
          -- PAYMENT_CORRECT en PAYMENT_RELINK bewust zonder PAYMENT_READ: ADMIN corrigeert zonder de betalingen te lezen.
          ('PAYMENT_READ', 'BOOKING_READ'),
          ('ROLEAUTHORITY_READ', 'ROLE_READ'), ('ROLEAUTHORITY_READ', 'AUTHORITY_READ'),
          ('ACCOUNTROLE_READ', 'ACCOUNT_READ'), ('ACCOUNTROLE_READ', 'ROLE_READ'),
          ('USER_SCOPE_ORGANIZATION', 'PERSON_READ'), ('USER_SCOPE_ORGANIZATION', 'ACCOUNT_READ')
     ) AS pair (authority, required)
JOIN authority a ON a.description = pair.authority
JOIN authority r ON r.description = pair.required
ON CONFLICT DO NOTHING;

-- 4. Sjabloon van de systeemrollen ----------------------------------------------------------------------------------------

CREATE TABLE system_role_template (
    system_key   VARCHAR(20) NOT NULL CHECK (system_key IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
    authority_id UUID        NOT NULL REFERENCES authority (authority_id) ON DELETE CASCADE,
    PRIMARY KEY (system_key, authority_id)
);

INSERT INTO system_role_template (system_key, authority_id)
SELECT r.description, ra.authority_id
FROM role_authority ra
JOIN role r ON r.role_id = ra.role_id
WHERE r.description IN ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- MANAGER richt voortaan zelf de rollen van de eigen organisatie in.
INSERT INTO system_role_template (system_key, authority_id)
SELECT 'MANAGER', authority_id FROM authority
WHERE description IN ('ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE', 'ROLEAUTHORITY_CREATE', 'ROLEAUTHORITY_DELETE')
ON CONFLICT DO NOTHING;

-- 5. Rollen per organisatie -------------------------------------------------------------------------------------------------

ALTER TABLE role
    ADD COLUMN tenant_organization UUID,
    ADD COLUMN system_key          VARCHAR(20) CHECK (system_key IN ('ADMIN', 'MANAGER', 'EMPLOYEE'));

UPDATE role SET system_key = description WHERE description IN ('ADMIN', 'MANAGER', 'EMPLOYEE');
UPDATE role SET tenant_organization = 'a0000000-0000-0000-0000-000000000001' WHERE system_key = 'ADMIN';

-- De bestaande MANAGER- en EMPLOYEE-rij wordt de kopie van de organisatie die hem het eerst gebruikte.
UPDATE role r
SET tenant_organization = COALESCE(
        (SELECT p.tenant_organization
         FROM account_role ar
         JOIN account a ON a.account_id = ar.account_id
         JOIN person p ON p.person_id = a.person_id
         WHERE ar.role_id = r.role_id
         ORDER BY a.created_at, a.account_id
         LIMIT 1),
        (SELECT organization_id FROM organization WHERE NOT platform ORDER BY created_at, organization_id LIMIT 1))
WHERE r.system_key IN ('MANAGER', 'EMPLOYEE');

-- Andere (zelf aangemaakte) rollen waren van de beheerder: die horen bij het platform.
UPDATE role SET tenant_organization = 'a0000000-0000-0000-0000-000000000001' WHERE tenant_organization IS NULL AND system_key IS NULL;
-- Een systeemrol zonder klantorganisatie (lege database) vervalt.
DELETE FROM role WHERE tenant_organization IS NULL;

-- Elke klant zonder kopie krijgt er een.
INSERT INTO role (role_id, description, tenant_organization, system_key, created_at)
SELECT gen_random_uuid(), k.system_key, o.organization_id, k.system_key, now()
FROM organization o
CROSS JOIN (VALUES ('MANAGER'), ('EMPLOYEE')) AS k (system_key)
WHERE NOT o.platform
  AND NOT EXISTS (SELECT 1 FROM role r WHERE r.tenant_organization = o.organization_id AND r.system_key = k.system_key);

-- Beheerders verhuizen naar het platform (hun accounts gaan mee via de foreign key uit V22).
UPDATE person
SET tenant_organization = 'a0000000-0000-0000-0000-000000000001'
WHERE person_id IN (SELECT a.person_id
                    FROM account a
                    JOIN account_role ar ON ar.account_id = a.account_id
                    JOIN role r ON r.role_id = ar.role_id
                    WHERE r.system_key = 'ADMIN');

-- Toewijzingen naar de kopie van de eigen organisatie; wat daar niet bestaat, vervalt.
UPDATE account_role ar
SET role_id = copy.role_id
FROM account a, role cur, role copy
WHERE a.account_id = ar.account_id
  AND cur.role_id = ar.role_id
  AND cur.system_key IS NOT NULL
  AND cur.tenant_organization <> a.tenant_organization
  AND copy.tenant_organization = a.tenant_organization
  AND copy.system_key = cur.system_key;

DELETE FROM account_role ar
USING account a, role r
WHERE a.account_id = ar.account_id AND r.role_id = ar.role_id AND r.tenant_organization <> a.tenant_organization;

ALTER TABLE role ALTER COLUMN tenant_organization SET NOT NULL;
ALTER TABLE role ADD CONSTRAINT fk_role_tenant_organization
    FOREIGN KEY (tenant_organization) REFERENCES organization (organization_id) ON DELETE CASCADE;
ALTER TABLE role ADD CONSTRAINT uq_role_tenant_organization UNIQUE (role_id, tenant_organization);
CREATE INDEX idx_role_tenant_organization ON role (tenant_organization);
CREATE UNIQUE INDEX uq_role_name_per_organization ON role (tenant_organization, lower(description));
CREATE UNIQUE INDEX uq_role_system_key_per_organization ON role (tenant_organization, system_key) WHERE system_key IS NOT NULL;

-- 6. Toewijzingen per organisatie -------------------------------------------------------------------------------------------

ALTER TABLE account ADD CONSTRAINT uq_account_tenant_organization UNIQUE (account_id, tenant_organization);

ALTER TABLE account_role ADD COLUMN tenant_organization UUID;
UPDATE account_role ar SET tenant_organization = a.tenant_organization FROM account a WHERE a.account_id = ar.account_id;
ALTER TABLE account_role ALTER COLUMN tenant_organization SET NOT NULL;
ALTER TABLE account_role ADD CONSTRAINT fk_account_role_tenant_organization
    FOREIGN KEY (tenant_organization) REFERENCES organization (organization_id) ON DELETE CASCADE;
ALTER TABLE account_role ADD CONSTRAINT fk_account_role_account_tenant_organization
    FOREIGN KEY (account_id, tenant_organization) REFERENCES account (account_id, tenant_organization)
        ON DELETE CASCADE ON UPDATE CASCADE;
-- NO ACTION (pas aan het eind van het statement gecontroleerd): een rol in gebruik is niet los te verwijderen,
-- maar een hele organisatie wel (rollen en toewijzingen gaan dan samen weg).
ALTER TABLE account_role ADD CONSTRAINT fk_account_role_role_tenant_organization
    FOREIGN KEY (role_id, tenant_organization) REFERENCES role (role_id, tenant_organization);
CREATE INDEX idx_account_role_tenant_organization ON account_role (tenant_organization);
CREATE INDEX idx_account_role_role ON account_role (role_id);

-- 7. Systeemrollen vergrendelen en gelijk houden met het sjabloon ---------------------------------------------------------

CREATE FUNCTION sync_system_roles() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('rds.sync_system_roles', 'on', true);
    DELETE FROM role_authority ra
    USING role r
    WHERE r.role_id = ra.role_id
      AND r.system_key IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM system_role_template t WHERE t.system_key = r.system_key AND t.authority_id = ra.authority_id);
    INSERT INTO role_authority (role_id, authority_id, created_at)
    SELECT r.role_id, t.authority_id, now()
    FROM role r
    JOIN system_role_template t ON t.system_key = r.system_key
    ON CONFLICT DO NOTHING;
    PERFORM set_config('rds.sync_system_roles', 'off', true);
END $$;

-- De inhoud van een systeemrol wijzigt alleen via sync_system_roles(). Bij het verwijderen van een hele organisatie is
-- de rol al weg (cascade) en mag de koppeling mee.
CREATE FUNCTION protect_system_role_authorities() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF current_setting('rds.sync_system_roles', true) = 'on' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF EXISTS (SELECT 1 FROM role WHERE role_id = COALESCE(NEW.role_id, OLD.role_id) AND system_key IS NOT NULL) THEN
        RAISE EXCEPTION 'Systeemrollen liggen vast: wijzig system_role_template en roep sync_system_roles() aan'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_role_authority_system_roles_locked
    BEFORE INSERT OR UPDATE OR DELETE ON role_authority FOR EACH ROW EXECUTE FUNCTION protect_system_role_authorities();

-- Een systeemrol is niet te hernoemen, te verhuizen of los te verwijderen, en ADMIN bestaat alleen in het platform.
CREATE FUNCTION protect_system_roles() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.system_key = 'ADMIN'
           AND NOT EXISTS (SELECT 1 FROM organization WHERE organization_id = NEW.tenant_organization AND platform) THEN
            RAISE EXCEPTION 'De rol ADMIN bestaat alleen in de platformorganisatie' USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.system_key IS NOT NULL
           AND (NEW.description <> OLD.description
                OR NEW.system_key IS DISTINCT FROM OLD.system_key
                OR NEW.tenant_organization <> OLD.tenant_organization) THEN
            RAISE EXCEPTION 'Systeemrollen liggen vast' USING ERRCODE = 'restrict_violation';
        END IF;
        IF OLD.system_key IS NULL AND NEW.system_key IS NOT NULL THEN
            RAISE EXCEPTION 'Een eigen rol kan geen systeemrol worden' USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
    END IF;
    -- DELETE: alleen als de organisatie zelf wordt verwijderd.
    IF OLD.system_key IS NOT NULL AND EXISTS (SELECT 1 FROM organization WHERE organization_id = OLD.tenant_organization) THEN
        RAISE EXCEPTION 'Systeemrollen liggen vast' USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
END $$;
CREATE TRIGGER trg_role_system_roles_locked
    BEFORE INSERT OR UPDATE OR DELETE ON role FOR EACH ROW EXECUTE FUNCTION protect_system_roles();

SELECT sync_system_roles();

-- 8. Rechtenlogboek -------------------------------------------------------------------------------------------------------

CREATE TABLE authorization_log (
    authorization_log_id UUID PRIMARY KEY,
    tenant_organization  UUID         NOT NULL,
    action               VARCHAR(30)  NOT NULL CHECK (action IN ('ROLE_CREATED', 'ROLE_RENAMED', 'ROLE_DELETED',
                                                                 'AUTHORITY_ADDED', 'AUTHORITY_REMOVED',
                                                                 'ROLE_ASSIGNED', 'ROLE_REVOKED')),
    role_id              UUID,
    role_name            VARCHAR(255),
    authority            VARCHAR(255),
    account_id           UUID,
    account_user_name    VARCHAR(255),
    details              TEXT,
    created_at           TIMESTAMP    NOT NULL,
    created_by           UUID,
    CONSTRAINT fk_authorization_log_tenant_organization
        FOREIGN KEY (tenant_organization) REFERENCES organization (organization_id) ON DELETE CASCADE
);
CREATE INDEX idx_authorization_log_tenant_organization ON authorization_log (tenant_organization, created_at);
CREATE INDEX idx_authorization_log_role ON authorization_log (role_id);
CREATE INDEX idx_authorization_log_account ON authorization_log (account_id);

-- Alleen toevoegen; verwijderen mag alleen samen met de hele organisatie.
CREATE FUNCTION protect_authorization_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM organization WHERE organization_id = OLD.tenant_organization) THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Het rechtenlogboek kan niet worden gewijzigd' USING ERRCODE = 'restrict_violation';
END $$;
CREATE TRIGGER trg_authorization_log_append_only
    BEFORE UPDATE OR DELETE ON authorization_log FOR EACH ROW EXECUTE FUNCTION protect_authorization_log();
