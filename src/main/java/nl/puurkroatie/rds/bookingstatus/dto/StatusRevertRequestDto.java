package nl.puurkroatie.rds.bookingstatus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Status terugzetten naar een eerdere status, altijd met reden. */
public record StatusRevertRequestDto(
        @NotNull String targetStatus,
        @NotBlank @Size(min = 5, max = 500) String reason) {
}
