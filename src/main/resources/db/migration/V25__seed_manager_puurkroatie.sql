-- Seed: Wendy Vos wordt MANAGER van Puurkroatie, zodat elke klantorganisatie in de seed een manager heeft die haar
-- eigen rollen kan inrichten. Wachtwoord zoals de andere seedgebruikers: 'password123' (bcrypt).

INSERT INTO person (person_id, firstname, prefix, lastname, tenant_organization, created_at, created_by)
VALUES ('b1000000-0000-0000-0000-000000000005', 'Wendy', NULL, 'Vos', 'a1000000-0000-0000-0000-000000000001',
        '2026-11-17 12:00:00', NULL);

INSERT INTO account (account_id, user_name, password_hash, person_id, tenant_organization, locked, must_change_password,
                     totp_enabled, totp_verified, expires_at, created_at, created_by)
VALUES ('e1000000-0000-0000-0000-000000000005', 'wendy.vos', '$2a$10$kTLZtPFTPFRb4lXnP9dlL.5XiJzHzb8rD3Si7PXUycOkzJobk0dPW',
        'b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', false, false, false, false,
        '2027-01-01 00:00:00', '2026-11-17 12:00:00', NULL);

INSERT INTO account_role (account_id, role_id, tenant_organization, created_at, created_by)
SELECT 'e1000000-0000-0000-0000-000000000005', role_id, tenant_organization, '2026-11-17 12:00:00', NULL
FROM role
WHERE tenant_organization = 'a1000000-0000-0000-0000-000000000001' AND system_key = 'MANAGER';
