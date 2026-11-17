package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    /** De organisatie heeft de nieuwe rechten gezien (rollenscherm). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Organization o set o.rolesReviewedAt = :reviewedAt where o.organizationId = :organizationId")
    int markRolesReviewed(@Param("organizationId") UUID organizationId, @Param("reviewedAt") LocalDateTime reviewedAt);
}
