-- CHECK-constraints op de status-kolommen van BOOKING en BOOKER, zodat de database zelf afdwingt welke
-- waarden toegestaan zijn (tot nu toe stond alleen de Java-enum ertussen). Tegelijk komen er twee
-- statussen bij: BOOKING 'OPREIS' (de reis is bezig) en 'WEERTHUIS' (de reis is afgelopen, het dossier nog niet afgerond)
-- en BOOKER 'NIETACTIEF' (niet meer actief).
--
-- De waarden zijn de enum-namen (Hibernate slaat @Enumerated(STRING) in hoofdletters op), dus
-- BookingStatus en BookerStatus in Java moeten exact dezelfde lijst hebben; StatusConstraintsTest bewaakt dat.
--
-- Deze migratie faalt (en wordt dan volledig teruggedraaid) als er al een rij staat met een waarde die
-- niet in de lijst zit.
--
-- Een status LATER WIJZIGEN:
--  * Alleen een waarde toevoegen: DROP CONSTRAINT en weer ADD CONSTRAINT met de uitgebreide lijst.
--  * Een waarde hernoemen of laten vervallen: eerst de constraint droppen, dan de bestaande rijen met een
--    UPDATE omzetten, en daarna de constraint opnieuw toevoegen. Een CHECK-constraint wordt bij het
--    toevoegen namelijk tegen alle bestaande rijen gecontroleerd. De Java-enum, de API-waarde (kleine
--    letters), de frontend-lijsten, de vertalingen en eventuele templates moeten in dezelfde release mee.
--  * Zonder lang te locken op een grote tabel: ADD CONSTRAINT ... NOT VALID, data bijwerken, dan
--    VALIDATE CONSTRAINT.

ALTER TABLE booking
    ADD CONSTRAINT booking_status_check
    CHECK (booking_status IN ('AANVRAAG', 'OFFERTE', 'BOEKING', 'VOORSCHOT', 'BETAALD', 'OPREIS', 'WEERTHUIS', 'AFGEROND'));

ALTER TABLE booker
    ADD CONSTRAINT booker_status_check
    CHECK (status IN ('PROSPECT', 'ACTIVE', 'NIETACTIEF'));
