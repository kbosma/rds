-- Verzonden e-mails aan de hoofdboeker van een boeking worden bewaard (tijdlijn "Berichten en documenten").
-- Net als documenten en betalingen zijn ze geschiedenis: alleen-toevoegen, en een boeking met verzonden
-- e-mails kan niet verwijderd worden (ON DELETE RESTRICT).
CREATE TABLE sent_email (
    sent_email_id       UUID PRIMARY KEY,
    booking_id          UUID NOT NULL REFERENCES booking (booking_id) ON DELETE RESTRICT,
    from_address        VARCHAR(255) NOT NULL,
    to_address          VARCHAR(255) NOT NULL,
    subject             TEXT NOT NULL,
    body_html           TEXT NOT NULL,
    resent_from_id      UUID REFERENCES sent_email (sent_email_id) ON DELETE RESTRICT,
    created_at          TIMESTAMP NOT NULL,
    created_by          UUID,
    tenant_organization UUID NOT NULL
);

CREATE INDEX idx_sent_email_booking ON sent_email (booking_id, created_at);

CREATE FUNCTION forbid_sent_email_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'sent_email is alleen-toevoegen: een verzonden e-mail wijzigen of verwijderen is niet toegestaan'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sent_email_no_update BEFORE UPDATE ON sent_email
    FOR EACH ROW EXECUTE FUNCTION forbid_sent_email_change();
CREATE TRIGGER sent_email_no_delete BEFORE DELETE ON sent_email
    FOR EACH ROW EXECUTE FUNCTION forbid_sent_email_change();
CREATE TRIGGER sent_email_no_truncate BEFORE TRUNCATE ON sent_email
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_sent_email_change();
