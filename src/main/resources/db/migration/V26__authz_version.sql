-- Fase 5 van docs/voorstel-eigen-rollen.md: wijzigingen in rechten werken direct door.
--
-- account.authz_version gaat omhoog zodra de rechten van het account veranderen. Het token draagt de versie (claim
-- "av"); de backend weigert een token met een oude versie (401 AUTHZ_CHANGED) en de frontend haalt een nieuw token op.
--
-- Triggers houden de versie bij, zodat het ook klopt bij directe SQL en bij sync_system_roles():
--   - een rol toegewezen aan of ingetrokken bij het account;
--   - een recht toegevoegd aan of weggehaald uit een rol van het account;
--   - het account gelockt/ontgrendeld of de vervaldatum gewijzigd (een oud token mag dan niet meer verversen).

ALTER TABLE account ADD COLUMN authz_version INTEGER NOT NULL DEFAULT 0;

CREATE FUNCTION bump_authz_version_on_account_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE account SET authz_version = authz_version + 1 WHERE account_id = COALESCE(NEW.account_id, OLD.account_id);
    RETURN NULL;
END $$;
-- Alleen toevoegen en verwijderen: een UPDATE op account_role komt alleen voor als de organisatie van een account
-- meeverhuist (ON UPDATE CASCADE), en dan veranderen de rechten niet.
CREATE TRIGGER trg_account_role_bumps_authz_version
    AFTER INSERT OR DELETE ON account_role FOR EACH ROW EXECUTE FUNCTION bump_authz_version_on_account_role();

CREATE FUNCTION bump_authz_version_on_role_authority() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE account SET authz_version = authz_version + 1
    WHERE account_id IN (SELECT account_id FROM account_role WHERE role_id = COALESCE(NEW.role_id, OLD.role_id));
    RETURN NULL;
END $$;
CREATE TRIGGER trg_role_authority_bumps_authz_version
    AFTER INSERT OR DELETE ON role_authority FOR EACH ROW EXECUTE FUNCTION bump_authz_version_on_role_authority();

CREATE FUNCTION bump_authz_version_on_account_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.locked IS DISTINCT FROM OLD.locked OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
        NEW.authz_version := OLD.authz_version + 1;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_account_access_bumps_authz_version
    BEFORE UPDATE OF locked, expires_at ON account FOR EACH ROW EXECUTE FUNCTION bump_authz_version_on_account_access();
