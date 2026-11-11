-- Stap 3 van de automatische statussen: automatische betalingen.
-- 1) Een betaling heeft een soort en (optioneel) een vervaldatum. Bestaande betalingen zijn OVERIG.
--    VOORSCHOT, RESTANT en DEFINITIEF maakt het systeem bij het bevestigen van de offerte; OVERIG legt een
--    medewerker zelf vast.
-- 2) Organisatie-instellingen voor het betalingsschema: het voorschotpercentage, hoeveel weken voor vertrek het
--    voorschot en het restant vervallen, en de e-mail waarmee de hoofdboeker de betalingen krijgt.

ALTER TABLE mollie_payment ADD COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'OVERIG';
ALTER TABLE mollie_payment ADD COLUMN due_date DATE;
ALTER TABLE mollie_payment ADD CONSTRAINT mollie_payment_type_check
    CHECK (payment_type IN ('VOORSCHOT', 'RESTANT', 'DEFINITIEF', 'OVERIG'));

ALTER TABLE organization_settings ADD COLUMN deposit_percentage INTEGER NOT NULL DEFAULT 30;
ALTER TABLE organization_settings ADD COLUMN deposit_weeks_before_departure INTEGER NOT NULL DEFAULT 12;
ALTER TABLE organization_settings ADD COLUMN balance_weeks_before_departure INTEGER NOT NULL DEFAULT 6;
ALTER TABLE organization_settings ADD COLUMN payment_email_template_id UUID
    REFERENCES email_template (email_template_id) ON DELETE SET NULL;
ALTER TABLE organization_settings ADD CONSTRAINT organization_settings_deposit_percentage_check
    CHECK (deposit_percentage BETWEEN 1 AND 100);
ALTER TABLE organization_settings ADD CONSTRAINT organization_settings_weeks_check
    CHECK (balance_weeks_before_departure >= 0 AND deposit_weeks_before_departure > balance_weeks_before_departure);
