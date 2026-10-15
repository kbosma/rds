package nl.puurkroatie.rds.booking.service;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Ruimt adressen op die na het verwijderen van een booker, accommodatie of leverancier nergens meer aan hangen.
 *
 * De koppelrijen verdwijnen via de database (ON DELETE CASCADE), maar het adres zelf zou als wees achterblijven.
 * Gebruik: eerst {@link #addressesOf} (vóór het verwijderen), daarna de eigenlijke delete, daarna
 * {@link #deleteIfUnused}. Een adres dat ook nog aan iets anders hangt blijft staan.
 */
@Component
public class AddressCleanup {

    private final EntityManager entityManager;

    public AddressCleanup(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public List<UUID> ofBooker(UUID bookerId) {
        return addressesOf("booker_address", "booker_id", bookerId);
    }

    public List<UUID> ofAccommodation(UUID accommodationId) {
        return addressesOf("accommodation_address", "accommodation_id", accommodationId);
    }

    public List<UUID> ofSupplier(UUID supplierId) {
        return addressesOf("supplier_address", "supplier_id", supplierId);
    }

    @SuppressWarnings("unchecked")
    private List<UUID> addressesOf(String linkTable, String ownerColumn, UUID ownerId) {
        // tabel- en kolomnamen zijn vaste waarden uit deze klasse, geen invoer
        return entityManager.createNativeQuery(
                        "select address_id from " + linkTable + " where " + ownerColumn + " = :id")
                .setParameter("id", ownerId)
                .getResultList();
    }

    /** Verwijdert de adressen die na de delete nergens meer aan gekoppeld zijn. */
    public void deleteIfUnused(List<UUID> addressIds) {
        if (addressIds == null || addressIds.isEmpty()) {
            return;
        }
        entityManager.flush(); // eerst de delete van de eigenaar (en zijn koppelrijen) uitvoeren
        entityManager.createNativeQuery(
                        "delete from address a where a.address_id in (:ids)"
                                + " and not exists (select 1 from booker_address x where x.address_id = a.address_id)"
                                + " and not exists (select 1 from accommodation_address x where x.address_id = a.address_id)"
                                + " and not exists (select 1 from supplier_address x where x.address_id = a.address_id)")
                .setParameter("ids", addressIds)
                .executeUpdate();
    }
}
