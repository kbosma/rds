package nl.puurkroatie.rds.auth.service;

import jakarta.persistence.EntityManager;
import nl.puurkroatie.rds.common.DeletionBlockedException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Een organisatie mag niet verdwijnen zolang er bedrijfsgegevens van haar bestaan.
 *
 * Elke tenant-tabel verwijst met {@code tenant_organization} naar de organisatie (V21, V22). Bedrijfsgegevens
 * (boekingen, bookers, accommodaties, documenten, templates, ...) doen dat met ON DELETE RESTRICT; de gegevens van de
 * organisatie zelf (personen, accounts, huisstijl, instellingen) met ON DELETE CASCADE en gaan dus mee.
 *
 * Deze guard telt per RESTRICT-tabel de rijen van de organisatie en weigert met een leesbare melding, in plaats van
 * de foutmelding van de database. De lijst komt uit de databasecatalogus, zodat een nieuwe tabel vanzelf meedoet.
 */
@Component
public class OrganizationDeletionGuard {

    private final EntityManager entityManager;

    public OrganizationDeletionGuard(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @SuppressWarnings("unchecked")
    public void verifyDeletable(UUID organizationId) {
        List<String> tables = entityManager.createNativeQuery(
                        "select distinct c.conrelid::regclass::text from pg_constraint c "
                                + "join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey) "
                                + "where c.contype = 'f' and a.attname = 'tenant_organization' "
                                + "and c.confrelid = 'organization'::regclass and c.confdeltype = 'r' "
                                + "order by 1")
                .getResultList();

        Map<String, Long> remaining = new LinkedHashMap<>();
        for (String table : tables) {
            // De tabelnaam komt uit de databasecatalogus; toch quoten we hem voor de zekerheid.
            Number count = (Number) entityManager.createNativeQuery(
                            "select count(*) from \"" + table.replace("\"", "\"\"") + "\" where tenant_organization = :id")
                    .setParameter("id", organizationId)
                    .getSingleResult();
            if (count != null && count.longValue() > 0) {
                remaining.put(table, count.longValue());
            }
        }

        if (!remaining.isEmpty()) {
            StringBuilder what = new StringBuilder();
            remaining.forEach((table, count) -> what.append(what.isEmpty() ? "" : ", ").append(table).append(": ").append(count));
            throw new DeletionBlockedException("This organization cannot be deleted: it still has data ("
                    + what + "). Remove or move that data first.");
        }
    }
}
