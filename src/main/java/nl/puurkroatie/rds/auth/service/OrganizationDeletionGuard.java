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
 * De tabellen met bedrijfsgegevens (boekingen, bookers, accommodaties, documenten, templates, afbeeldingen, ...)
 * verwijzen met een gewone kolom {@code tenant_organization} naar de organisatie, zonder foreign key. Verwijderen
 * van de organisatie zou die gegevens dus onvindbaar achterlaten (wees-data). Daarom weigert deze guard het
 * verwijderen zolang er in één van die tabellen nog een rij voor de organisatie staat. De personen en accounts
 * van de organisatie vallen niet onder bedrijfsgegevens: die worden bij het verwijderen meegenomen.
 *
 * De lijst met tabellen wordt uit de database zelf gelezen (alle tabellen met een kolom
 * {@code tenant_organization}), zodat een toekomstige tabel vanzelf wordt meegenomen.
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
                        "select table_name from information_schema.columns "
                                + "where column_name = 'tenant_organization' and table_schema = current_schema() "
                                + "order by table_name")
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
