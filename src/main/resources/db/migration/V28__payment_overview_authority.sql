-- PAYMENT_OVERVIEW: het overzicht van alle betalingen van de organisatie (menu Betalingen, manager-dashboard).
--
-- Tot nu toe hingen dat overzicht en de betalingen bij één boeking allebei aan PAYMENT_READ. Wie het overzicht niet
-- mocht zien, zag dan ook de betalingenkaart in de boeking niet. PAYMENT_READ blijft voor de betalingen van een boeking;
-- de lijsten over alle boekingen heen vragen voortaan PAYMENT_OVERVIEW (en dat vereist PAYMENT_READ).
--
-- MANAGER krijgt het recht, EMPLOYEE niet. Eigen rollen krijgen het niet vanzelf: het rollenscherm meldt het als nieuw
-- recht (introduced_at), zie docs/voorstel-eigen-rollen.md.

INSERT INTO authority (authority_id, description, domain, tenant_assignable, introduced_at)
VALUES ('d1000000-0000-0000-0000-000000000072', 'PAYMENT_OVERVIEW', 'PAYMENT', true, DATE '2026-11-18');

INSERT INTO authority_requires (authority_id, required_authority_id)
SELECT 'd1000000-0000-0000-0000-000000000072', authority_id FROM authority WHERE description = 'PAYMENT_READ';

-- Alleen MANAGER (ADMIN heeft geen PAYMENT_READ, EMPLOYEE krijgt het overzicht bewust niet).
INSERT INTO system_role_template (system_key, authority_id)
VALUES ('MANAGER', 'd1000000-0000-0000-0000-000000000072');

SELECT sync_system_roles();
