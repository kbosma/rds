-- Stap 4 van de automatische statussen: statusengine en notificaties.
-- 1) Notificaties bij een boeking: iets dat een medewerker moet oppakken (alles betaald, op reis, weer thuis,
--    terugboeking). Een notificatie wordt afgehandeld (wie, wanneer), nooit verwijderd.
-- 2) Statusgeschiedenis van een boeking: elke statuswijziging, door het systeem of met de hand (dan met reden).
--    Alleen-toevoegen.
-- 3) Betaalstatus CHARGED_BACK: Mollie meldt een terugboeking (chargeback); ook als correctie te registreren.
-- 4) Authorities: notificaties lezen/afhandelen, status terugzetten (zolang niets betaald is, en ook daarna),
--    boeking afronden.

CREATE TABLE notification (
    notification_id     UUID PRIMARY KEY,
    booking_id          UUID         NOT NULL REFERENCES booking (booking_id) ON DELETE RESTRICT,
    kind                VARCHAR(30)  NOT NULL,
    title               VARCHAR(255) NOT NULL,
    notified_at         TIMESTAMP    NOT NULL,
    handled             BOOLEAN      NOT NULL DEFAULT FALSE,
    handled_at          TIMESTAMP,
    handled_by          UUID,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    tenant_organization UUID         NOT NULL,
    CONSTRAINT notification_kind_check CHECK (kind IN ('ALLES_BETAALD', 'OP_REIS', 'WEER_THUIS', 'TERUGBOEKING')),
    CONSTRAINT notification_handled_check CHECK (handled = (handled_at IS NOT NULL))
);
CREATE INDEX idx_notification_booking ON notification (booking_id);
CREATE INDEX idx_notification_open ON notification (tenant_organization, handled);

CREATE TABLE booking_status_change (
    booking_status_change_id UUID PRIMARY KEY,
    booking_id               UUID        NOT NULL REFERENCES booking (booking_id) ON DELETE RESTRICT,
    from_status              VARCHAR(20) NOT NULL,
    to_status                VARCHAR(20) NOT NULL,
    automatic                BOOLEAN     NOT NULL,
    reason                   TEXT        NOT NULL,
    created_at               TIMESTAMP   NOT NULL,
    created_by               UUID,
    tenant_organization      UUID        NOT NULL,
    CONSTRAINT booking_status_change_reason_check CHECK (char_length(btrim(reason)) >= 5),
    CONSTRAINT booking_status_change_differs_check CHECK (from_status <> to_status)
);
CREATE INDEX idx_booking_status_change_booking ON booking_status_change (booking_id, created_at);

CREATE FUNCTION forbid_booking_status_change_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'booking_status_change is alleen-toevoegen: een statuswijziging wijzigen of verwijderen is niet toegestaan'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER booking_status_change_no_update BEFORE UPDATE ON booking_status_change
    FOR EACH ROW EXECUTE FUNCTION forbid_booking_status_change_change();
CREATE TRIGGER booking_status_change_no_delete BEFORE DELETE ON booking_status_change
    FOR EACH ROW EXECUTE FUNCTION forbid_booking_status_change_change();
CREATE TRIGGER booking_status_change_no_truncate BEFORE TRUNCATE ON booking_status_change
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_booking_status_change_change();

ALTER TABLE mollie_payment_status_entry DROP CONSTRAINT payment_status_entry_status_check;
ALTER TABLE mollie_payment_status_entry
    ADD CONSTRAINT payment_status_entry_status_check
    CHECK (status IN ('OPEN', 'PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'CHARGED_BACK'));

INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000067', 'NOTIFICATION_READ'),
    ('d1000000-0000-0000-0000-000000000068', 'NOTIFICATION_UPDATE'),
    ('d1000000-0000-0000-0000-000000000069', 'BOOKING_STATUS_REVERT'),
    ('d1000000-0000-0000-0000-00000000006a', 'BOOKING_STATUS_REVERT_PAID'),
    ('d1000000-0000-0000-0000-00000000006b', 'BOOKING_COMPLETE');

-- MANAGER (...003) alles; EMPLOYEE (...002) notificaties en terugzetten zolang er niets betaald is.
INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000067'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000068'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000069'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-00000000006a'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-00000000006b'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000067'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000068'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000069');
