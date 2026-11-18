-- Rechtenlogboek: wie de wijziging deed, als naam vastgelegd op het moment van de wijziging (net als role_name en
-- account_user_name). Zo blijft de regel leesbaar als het account later verdwijnt of een andere naam krijgt.

ALTER TABLE authorization_log ADD COLUMN created_by_name VARCHAR(255);

-- Bestaande regels aanvullen. Het logboek is append-only (trigger uit V24); alleen voor deze eenmalige aanvulling gaat
-- die trigger even uit.
ALTER TABLE authorization_log DISABLE TRIGGER trg_authorization_log_append_only;

UPDATE authorization_log l
SET created_by_name = concat_ws(' ', p.firstname, p.prefix, p.lastname)
FROM account a JOIN person p ON p.person_id = a.person_id
WHERE a.account_id = l.created_by;

ALTER TABLE authorization_log ENABLE TRIGGER trg_authorization_log_append_only;
