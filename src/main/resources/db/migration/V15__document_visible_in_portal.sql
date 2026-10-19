-- Een document is alleen zichtbaar in het boekerportaal als dat bij het aanmaken (of daarna) is aangezet; standaard uit.
-- Bestaande documenten waren al zichtbaar in het portaal en blijven dat, zodat er voor boekers niets verdwijnt.
ALTER TABLE document ADD COLUMN visible_in_portal BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE document SET visible_in_portal = TRUE;
