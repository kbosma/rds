-- Een betaling en haar statushistorie worden NOOIT verwijderd, ook niet als er (nog) geen Mollie-id is.
-- De API biedt geen verwijderfunctie meer; deze triggers dwingen het ook in de database af, zodat een fout in de code,
-- een handmatige SQL-opdracht of een cascade (bv. bij het verwijderen van een betaling) de historie niet kan laten
-- verdwijnen. (Wijzigen van een statusregel is al verboden sinds V10.)

CREATE FUNCTION forbid_payment_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% mag niet worden verwijderd: een betaling en haar statushistorie blijven altijd bewaard', TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mollie_payment_no_delete
    BEFORE DELETE ON mollie_payment
    FOR EACH ROW EXECUTE FUNCTION forbid_payment_delete();

CREATE TRIGGER mollie_payment_no_truncate
    BEFORE TRUNCATE ON mollie_payment
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_payment_delete();

CREATE TRIGGER payment_status_entry_no_delete
    BEFORE DELETE ON mollie_payment_status_entry
    FOR EACH ROW EXECUTE FUNCTION forbid_payment_delete();

CREATE TRIGGER payment_status_entry_no_truncate
    BEFORE TRUNCATE ON mollie_payment_status_entry
    FOR EACH STATEMENT EXECUTE FUNCTION forbid_payment_delete();
