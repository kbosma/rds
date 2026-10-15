-- Voeg een status toe aan BOOKER voor het aanmeldproces van potentiële bookers.
-- Een PROSPECT is in het datamodel gewoon een Booker (zonder booking); ACTIVE is
-- een reguliere booker. Bestaande bookers worden ACTIVE.
--
-- Opgeslagen als enum-naam (PROSPECT/ACTIVE) via @Enumerated(STRING).
-- Er kunnen later meer statussen bijkomen; de kolom is bewust een vrije VARCHAR.

ALTER TABLE booker ADD COLUMN status VARCHAR(255);
UPDATE booker SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE booker ALTER COLUMN status SET NOT NULL;
