-- De koppeling van een betaling aan een boeking wordt nooit losgemaakt. Een betaling die aan de verkeerde boeking
-- hangt, wordt HERKOPPELD aan een andere boeking, met reden: dat is een geregistreerde handeling (wie, wanneer, van
-- welke boeking naar welke, waarom) in een alleen-toevoegen-tabel. De betaling en haar statushistorie blijven staan.

CREATE TABLE booking_mollie_payment_relink (
    relink_id           UUID PRIMARY KEY,
    relink_seq          BIGSERIAL    NOT NULL UNIQUE,       -- volgorde van de herkoppelingen, ook bij gelijke tijd
    mollie_payment_id   UUID         NOT NULL REFERENCES mollie_payment(mollie_payment_id) ON DELETE RESTRICT,
    from_booking_id     UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE RESTRICT,
    to_booking_id       UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE RESTRICT,
    reason              TEXT         NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    tenant_organization UUID         NOT NULL,
    CONSTRAINT relink_reason_check CHECK (char_length(btrim(reason)) >= 5),
    CONSTRAINT relink_other_booking_check CHECK (from_booking_id <> to_booking_id)
);

CREATE INDEX idx_relink_mollie_payment ON booking_mollie_payment_relink (mollie_payment_id);

-- De herkoppelingen zelf zijn alleen-toevoegen.
CREATE FUNCTION forbid_relink_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'booking_mollie_payment_relink is alleen-toevoegen: een herkoppeling wijzigen of verwijderen is niet toegestaan'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relink_no_update BEFORE UPDATE ON booking_mollie_payment_relink
    FOR EACH ROW EXECUTE FUNCTION forbid_relink_change();
CREATE TRIGGER relink_no_delete BEFORE DELETE ON booking_mollie_payment_relink
    FOR EACH ROW EXECUTE FUNCTION forbid_relink_change();
CREATE TRIGGER relink_no_truncate BEFORE TRUNCATE ON booking_mollie_payment_relink
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_relink_change();

-- Een koppeling wordt nooit verwijderd (ook niet via een cascade vanuit de boeking).
CREATE FUNCTION forbid_payment_link_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'booking_mollie_payment: een koppeling tussen een betaling en een boeking wordt nooit verwijderd (gebruik een herkoppeling met reden)'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_link_no_delete BEFORE DELETE ON booking_mollie_payment
    FOR EACH ROW EXECUTE FUNCTION forbid_payment_link_delete();
CREATE TRIGGER payment_link_no_truncate BEFORE TRUNCATE ON booking_mollie_payment
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_payment_link_delete();

-- Een koppeling mag alleen naar een andere boeking verhuizen als die herkoppeling zojuist is geregistreerd: de
-- nieuwste herkoppeling van deze betaling moet precies van de huidige naar de nieuwe boeking gaan.
CREATE FUNCTION guard_payment_link_update() RETURNS trigger AS $$
BEGIN
    IF NEW.mollie_payment_id IS DISTINCT FROM OLD.mollie_payment_id THEN
        RAISE EXCEPTION 'booking_mollie_payment: de betaling van een koppeling kan niet worden gewijzigd'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.booking_id IS DISTINCT FROM OLD.booking_id AND NOT EXISTS (
            SELECT 1 FROM (
                SELECT from_booking_id, to_booking_id
                FROM booking_mollie_payment_relink
                WHERE mollie_payment_id = OLD.mollie_payment_id
                ORDER BY relink_seq DESC
                LIMIT 1) newest
            WHERE newest.from_booking_id = OLD.booking_id AND newest.to_booking_id = NEW.booking_id) THEN
        RAISE EXCEPTION 'booking_mollie_payment: een betaling kan alleen met een geregistreerde herkoppeling (met reden) naar een andere boeking'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_link_guard_update BEFORE UPDATE ON booking_mollie_payment
    FOR EACH ROW EXECUTE FUNCTION guard_payment_link_update();

-- Wie een betaling mag herkoppelen: ADMIN en MANAGER.
INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000063', 'PAYMENT_RELINK');

INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000063'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000063');
