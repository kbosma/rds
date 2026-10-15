package nl.puurkroatie.rds.docgen.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Bouwt de naam van een gegenereerd document: {@code <template> - <boekingsnummer> - <datum tijd>.<ext>}.
 *
 * Datum en tijd (tot op de seconde) staan erin zodat meerdere documenten uit dezelfde template bij
 * dezelfde boeking onderscheidbaar zijn. De tijd gebruikt geen ':' (ongeldig in bestandsnamen op
 * o.a. Windows, en de naam wordt bij het downloaden de bestandsnaam).
 */
public final class GeneratedDocumentName {

    /** De kolom document.displayname is VARCHAR(255). */
    static final int MAX_LENGTH = 255;

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss");

    private GeneratedDocumentName() {
    }

    /**
     * @param extension inclusief punt, bv. ".docx"
     */
    public static String of(String templateName, String bookingNumber, LocalDateTime now, String extension) {
        String suffix = " - " + bookingNumber + " - " + TIMESTAMP.format(now) + extension;
        // De templatenaam mag zelf 255 tekens zijn: kort die in zodat de totale naam in de kolom past
        // (anders zou het opslaan van het document falen op de databasegrens).
        int room = Math.max(0, MAX_LENGTH - suffix.length());
        String name = templateName.length() > room ? templateName.substring(0, room) : templateName;
        return name + suffix;
    }
}
