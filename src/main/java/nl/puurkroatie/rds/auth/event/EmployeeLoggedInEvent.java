package nl.puurkroatie.rds.auth.event;

import java.util.UUID;

/** Een medewerker is ingelogd (na eventuele 2FA). Wie bij inloggen iets wil bijwerken, luistert hiernaar. */
public record EmployeeLoggedInEvent(UUID accountId, UUID organizationId) {
}
