-- Bedrijfsgegevens verwijzen met tenant_organization naar hun organisatie. Tot nu toe zonder foreign key: de
-- OrganizationDeletionGuard (409) voorkwam verweesde data, maar alleen via de API. Deze migratie laat de database
-- het zelf afdwingen, ook bij handmatige SQL of een codepad zonder guard.
--
-- ON DELETE RESTRICT, bewust geen CASCADE: betalingen, betaalkoppelingen en herkoppelingen mogen nooit verdwijnen
-- (triggers in V11/V12), en een organisatie met administratie hoort niet met één klik te verdwijnen. Een organisatie
-- met bedrijfsgegevens is dus niet te verwijderen; personen, accounts, thema en instellingen gaan via hun eigen
-- foreign key (ON DELETE CASCADE) nog steeds mee met een lege organisatie.
--
-- Een nieuwe tabel met tenant_organization krijgt dezelfde foreign key (TenantOrganizationForeignKeyTest bewaakt dat).
-- 1) Foreign keys. NOT VALID: nieuwe en gewijzigde rijen en het verwijderen van een organisatie worden direct
--    gecontroleerd; de bestaande rijen worden hieronder apart gevalideerd.
ALTER TABLE accommodation
    ADD CONSTRAINT fk_accommodation_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE activity
    ADD CONSTRAINT fk_activity_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE address
    ADD CONSTRAINT fk_address_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booker
    ADD CONSTRAINT fk_booker_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booking
    ADD CONSTRAINT fk_booking_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booking_activity
    ADD CONSTRAINT fk_booking_activity_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booking_line
    ADD CONSTRAINT fk_booking_line_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booking_mollie_payment_relink
    ADD CONSTRAINT fk_booking_mollie_payment_relink_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE booking_status_change
    ADD CONSTRAINT fk_booking_status_change_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE document
    ADD CONSTRAINT fk_document_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE document_template
    ADD CONSTRAINT fk_document_template_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE email_image
    ADD CONSTRAINT fk_email_image_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE email_template
    ADD CONSTRAINT fk_email_template_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE mollie_payment
    ADD CONSTRAINT fk_mollie_payment_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE notification
    ADD CONSTRAINT fk_notification_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE sent_email
    ADD CONSTRAINT fk_sent_email_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE supplier
    ADD CONSTRAINT fk_supplier_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE traveler
    ADD CONSTRAINT fk_traveler_tenant_organization FOREIGN KEY (tenant_organization)
        REFERENCES organization (organization_id) ON DELETE RESTRICT NOT VALID;

-- 2) Bestaande rijen valideren. Staan er toch al wezen in een tabel (een organisatie die vóór deze migratie verwijderd
--    is), dan blijft alleen die constraint NOT VALID en meldt de migratie een waarschuwing, in plaats van de start
--    van de applicatie te blokkeren. De bescherming voor nieuwe rijen en voor het verwijderen geldt dan al wel.
--    Opruimen en daarna handmatig valideren: ALTER TABLE <tabel> VALIDATE CONSTRAINT fk_<tabel>_tenant_organization;
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['accommodation', 'activity', 'address', 'booker',
                             'booking', 'booking_activity', 'booking_line', 'booking_mollie_payment_relink',
                             'booking_status_change', 'document', 'document_template', 'email_image',
                             'email_template', 'mollie_payment', 'notification', 'sent_email',
                             'supplier', 'traveler']
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', t, 'fk_' || t || '_tenant_organization');
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE WARNING 'fk_%_tenant_organization blijft NOT VALID: % bevat rijen van een niet-bestaande organisatie', t, t;
        END;
    END LOOP;
END;
$$;

-- 3) Indexen op tenant_organization: elke lijst filtert erop (TenantContext), en de RESTRICT-controle bij het
--    verwijderen van een organisatie zoekt erop. email_image en notification hebben er al een.
CREATE INDEX idx_accommodation_tenant_organization ON accommodation (tenant_organization);
CREATE INDEX idx_activity_tenant_organization ON activity (tenant_organization);
CREATE INDEX idx_address_tenant_organization ON address (tenant_organization);
CREATE INDEX idx_booker_tenant_organization ON booker (tenant_organization);
CREATE INDEX idx_booking_tenant_organization ON booking (tenant_organization);
CREATE INDEX idx_booking_activity_tenant_organization ON booking_activity (tenant_organization);
CREATE INDEX idx_booking_line_tenant_organization ON booking_line (tenant_organization);
CREATE INDEX idx_booking_mollie_payment_relink_tenant_organization ON booking_mollie_payment_relink (tenant_organization);
CREATE INDEX idx_booking_status_change_tenant_organization ON booking_status_change (tenant_organization);
CREATE INDEX idx_document_tenant_organization ON document (tenant_organization);
CREATE INDEX idx_document_template_tenant_organization ON document_template (tenant_organization);
CREATE INDEX idx_email_template_tenant_organization ON email_template (tenant_organization);
CREATE INDEX idx_mollie_payment_tenant_organization ON mollie_payment (tenant_organization);
CREATE INDEX idx_sent_email_tenant_organization ON sent_email (tenant_organization);
CREATE INDEX idx_supplier_tenant_organization ON supplier (tenant_organization);
CREATE INDEX idx_traveler_tenant_organization ON traveler (tenant_organization);
