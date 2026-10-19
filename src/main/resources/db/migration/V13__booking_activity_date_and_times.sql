-- Een boekingsactiviteit vindt op één dag plaats: één datum plus een van- en tot-tijd.
-- Een nachtelijke activiteit blijkt uit de tijden (until_time < from_time: eindigt de volgende dag).
ALTER TABLE booking_activity
    ADD COLUMN activity_date DATE,
    ADD COLUMN from_time     TIME,
    ADD COLUMN until_time    TIME;

-- Bestaande data: datum en starttijd uit from_date, eindtijd uit until_date.
-- Een eventuele einddatum meer dan één dag na de start kan niet meer worden bewaard.
UPDATE booking_activity
SET activity_date = CAST(from_date AS DATE),
    from_time     = CAST(from_date AS TIME),
    until_time    = CAST(until_date AS TIME);

ALTER TABLE booking_activity
    DROP COLUMN from_date,
    DROP COLUMN until_date;

CREATE INDEX idx_booking_activity_booking_date
    ON booking_activity (booking_id, activity_date, from_time);
