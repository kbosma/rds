package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Authority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface AuthorityRepository extends JpaRepository<Authority, UUID> {

    List<Authority> findAllByOrderByDomainAscDescriptionAsc();

    Optional<Authority> findByDescription(String description);

    @Query("select a.description from Authority a where a.tenantAssignable = true")
    Set<String> findTenantAssignableNames();

    /** De effectieve authorities van een account: alle authorities van al zijn rollen, uit de database. */
    @Query(value = "select distinct a.description from account_role ar "
            + "join role_authority ra on ra.role_id = ar.role_id "
            + "join authority a on a.authority_id = ra.authority_id "
            + "where ar.account_id = :accountId", nativeQuery = true)
    Set<String> findEffectiveNamesByAccount(@Param("accountId") UUID accountId);

    @Query(value = "select a.description from role_authority ra join authority a on a.authority_id = ra.authority_id "
            + "where ra.role_id = :roleId", nativeQuery = true)
    Set<String> findNamesByRole(@Param("roleId") UUID roleId);

    /** Paren [authority, vereiste authority] uit authority_requires. */
    @Query(value = "select a.description, r.description from authority_requires q "
            + "join authority a on a.authority_id = q.authority_id "
            + "join authority r on r.authority_id = q.required_authority_id", nativeQuery = true)
    List<Object[]> findRequirementPairs();
}
