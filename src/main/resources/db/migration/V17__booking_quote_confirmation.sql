-- De hoofdboeker bevestigt de (laatste) offerte van een BOEKING: een vinkje plus het moment van bevestigen.
-- Beide horen bij elkaar: bevestigd heeft altijd een moment, niet bevestigd nooit.
ALTER TABLE booking ADD COLUMN quote_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE booking ADD COLUMN quote_confirmed_at TIMESTAMP;
ALTER TABLE booking ADD CONSTRAINT booking_quote_confirmed_check
    CHECK (quote_confirmed = (quote_confirmed_at IS NOT NULL));

-- De status van een BOEKER volgt voortaan uit zijn boekingen (BookerStatusUpdater):
--   geen boeking -> PROSPECT, een boeking die nog niet is afgerond -> ACTIVE, alle boekingen afgerond -> NIETACTIEF.
-- Bestaande boekers krijgen hier eenmalig de status die bij die regel hoort.
UPDATE booker b SET status = CASE
    WHEN NOT EXISTS (SELECT 1 FROM booking bk WHERE bk.booker_id = b.booker_id) THEN 'PROSPECT'
    WHEN EXISTS (SELECT 1 FROM booking bk WHERE bk.booker_id = b.booker_id AND bk.booking_status <> 'AFGEROND') THEN 'ACTIVE'
    ELSE 'NIETACTIEF'
END;
