package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.AuthorizationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AuthorizationLogRepository extends JpaRepository<AuthorizationLog, UUID> {

    /** Nieuwste eerst; {@code organizationId} leeg = alle organisaties (beheerder), rol en account optioneel. */
    @Query("select l from AuthorizationLog l "
            + "where (:organizationId is null or l.tenantOrganization = :organizationId) "
            + "and (:roleId is null or l.roleId = :roleId) "
            + "and (:accountId is null or l.accountId = :accountId) "
            + "order by l.createdAt desc")
    List<AuthorizationLog> search(@Param("organizationId") UUID organizationId,
                                  @Param("roleId") UUID roleId,
                                  @Param("accountId") UUID accountId);
}
