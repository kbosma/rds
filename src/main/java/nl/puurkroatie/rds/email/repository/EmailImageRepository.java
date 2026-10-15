package nl.puurkroatie.rds.email.repository;

import nl.puurkroatie.rds.email.entity.EmailImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailImageRepository extends JpaRepository<EmailImage, UUID> {

    /** Of afbeelding {@code id} bestaat ÉN bij deze organisatie hoort (zonder de bytes te laden). */
    boolean existsByEmailImageIdAndTenantOrganization(UUID id, UUID tenantOrganization);

    /** De afbeelding (mét bytes), maar alleen als hij bij deze organisatie hoort. */
    Optional<EmailImage> findByEmailImageIdAndTenantOrganization(UUID id, UUID tenantOrganization);

    List<EmailImageSummary> findAllByOrderByCreatedAtDesc();

    List<EmailImageSummary> findByTenantOrganizationOrderByCreatedAtDesc(UUID tenantOrganization);
}
