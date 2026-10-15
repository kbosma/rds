package nl.puurkroatie.rds.email.service;

/**
 * Gegooid bij het opslaan van een template die naar een afbeelding verwijst die niet bij de
 * eigen organisatie hoort (of niet bestaat). Valt via de global exception handler terug op
 * HTTP 400. De boodschap maakt bewust geen onderscheid tussen "bestaat niet" en "is van een
 * andere organisatie": zo lekt er niets over de afbeeldingen van anderen.
 */
public class InvalidImageReferenceException extends RuntimeException {

    public InvalidImageReferenceException(String message) {
        super(message);
    }
}
