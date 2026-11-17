-- Fase 1 van docs/voorstel-eigen-rollen.md: data-scope op authorities in plaats van rolnamen.
--
-- PLATFORM_ADMIN           over organisaties heen werken (was: rol ADMIN).
-- USER_SCOPE_ORGANIZATION  personen en accounts van de hele organisatie; zonder deze authority alleen het eigen
--                          persoon en account (was: rol EMPLOYEE zonder MANAGER/ADMIN).
--
-- Gedrag van ADMIN, MANAGER en EMPLOYEE blijft gelijk.

INSERT INTO authority (authority_id, description) VALUES
    ('d1000000-0000-0000-0000-000000000070', 'PLATFORM_ADMIN'),
    ('d1000000-0000-0000-0000-000000000071', 'USER_SCOPE_ORGANIZATION');

INSERT INTO role_authority (role_id, authority_id) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000070'), -- ADMIN: PLATFORM_ADMIN
    ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000071'), -- ADMIN: USER_SCOPE_ORGANIZATION
    ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000071'); -- MANAGER: USER_SCOPE_ORGANIZATION
