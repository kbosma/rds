-- De statusreeks van een betaling is ALLEEN-TOEVOEGEN: een regel wordt nooit gewijzigd of vervangen.
-- Statussen komen van Mollie. Een medewerker kan in uitzonderlijke gevallen een CORRECTIE registreren
-- (bv. de klant betaalde per bank, buiten Mollie om): dat is altijd een NIEUWE regel, met wie, wanneer
-- en waarom (verplichte reden). De bestaande Mollie-regels blijven ongewijzigd in de historie staan.

ALTER TABLE mollie_payment_status_entry
    ADD COLUMN correction BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE mollie_payment_status_entry
    ADD COLUMN reason TEXT;

-- Een correctie heeft altijd een reden van minstens 5 tekens (ook na wegknippen van witruimte).
ALTER TABLE mollie_payment_status_entry
    ADD CONSTRAINT payment_status_entry_correction_reason_check
    CHECK (NOT correction OR (reason IS NOT NULL AND char_length(btrim(reason)) >= 5));

-- Alleen bekende statussen (de namen van de enum MolliePaymentStatus).
ALTER TABLE mollie_payment_status_entry
    ADD CONSTRAINT payment_status_entry_status_check
    CHECK (status IN ('OPEN', 'PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED'));

-- Een bestaande regel mag niet meer gewijzigd worden, ook niet met handmatige SQL of door een fout in de code.
CREATE FUNCTION forbid_payment_status_entry_update() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'mollie_payment_status_entry is alleen-toevoegen: een regel wijzigen is niet toegestaan (voeg een nieuwe regel toe)'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_status_entry_no_update
    BEFORE UPDATE ON mollie_payment_status_entry
    FOR EACH ROW EXECUTE FUNCTION forbid_payment_status_entry_update();

-- Wie een correctie mag registreren: ADMIN en MANAGER.
INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000062', 'PAYMENT_CORRECT');

INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000062'),
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000062');
