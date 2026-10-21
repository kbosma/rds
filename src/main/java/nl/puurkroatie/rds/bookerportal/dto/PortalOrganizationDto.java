package nl.puurkroatie.rds.bookerportal.dto;

/** Naam en huisstijl van de organisatie. De kleuren en het logo zijn leeg als er geen thema is ingesteld. */
public record PortalOrganizationDto(
        String name,
        String primaryColor,
        String accentColor,
        String cardTitleColor,
        String logoUrl) {
}
