package nl.puurkroatie.rds.booking.repository;

import nl.puurkroatie.rds.booking.entity.Booking;

public interface BookingRepositoryCustom {

    /**
     * Slaat een (onveranderlijke, dus nieuw opgebouwde) boeking op en laadt haar daarna opnieuw uit de database.
     * Nodig omdat het samenvoegen van een nieuwe instantie de lijsten aan de "andere kant" (verblijven, activiteiten,
     * reizigers) in het geheugen leegmaakt; wie daarna in dezelfde transactie het totaal, de periode of de reizigers
     * leest (zoals de offerte-PDF of de betaalmail), zou anders lege lijsten zien.
     */
    Booking saveAndRefresh(Booking booking);
}
