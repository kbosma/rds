package nl.puurkroatie.rds.bookingstatus.dto;

import jakarta.validation.constraints.Size;

/** Boeking afronden; een toelichting is optioneel. */
public record CompleteRequestDto(@Size(max = 500) String reason) {
}
