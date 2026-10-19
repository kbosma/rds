package nl.puurkroatie.rds.booking.dto;

import jakarta.validation.constraints.NotNull;

/** Het enige wat van een bestaand document gewijzigd kan worden: zichtbaarheid in het boekerportaal. */
public record DocumentPortalVisibilityDto(@NotNull Boolean visibleInPortal) {
}
