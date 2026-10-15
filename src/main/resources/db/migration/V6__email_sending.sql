-- Slice 3: e-mails daadwerkelijk versturen.
-- 1) Per-organisatie afzenderadres (From). Centrale SMTP-relay, maar de afzender
--    verschilt per organisatie.
-- 2) Nieuwe granulaire authority EMAIL_SEND (los van de TEMPLATE_*-authorities:
--    een template beheren is iets anders dan er een mail mee versturen).

ALTER TABLE organization ADD COLUMN email_from VARCHAR(255);

-- Afzenderadres voor de demo-organisaties (lokaal/fake data).
UPDATE organization SET email_from = 'noreply@puurkroatie.nl'
    WHERE organization_id = 'a1000000-0000-0000-0000-000000000001';
UPDATE organization SET email_from = 'noreply@techpartner.example'
    WHERE organization_id = 'a1000000-0000-0000-0000-000000000002';

-- Nieuwe authority (volgt op DOCUMENT_DELETE = ...060).
INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000061', 'EMAIL_SEND');

-- EMAIL_SEND toekennen aan MANAGER (...003) en EMPLOYEE (...002): zij beheren
-- bookers/prospects en versturen de aanmeld-/informatiemails. ADMIN is puur
-- systeembeheer en krijgt deze business-authority bewust niet.
INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000061'),
    ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000061');
