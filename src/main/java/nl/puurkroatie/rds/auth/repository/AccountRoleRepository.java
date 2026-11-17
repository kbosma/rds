package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.AccountRoleId;
import nl.puurkroatie.rds.auth.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AccountRoleRepository extends JpaRepository<AccountRole, AccountRoleId> {

    List<AccountRole> findByAccount(Account account);

    List<AccountRole> findByTenantOrganization(UUID tenantOrganization);

    long countByRole(Role role);

    boolean existsByAccountAccountIdAndRoleSystemKey(UUID accountId, String systemKey);

    /** Bruikbare accounts (niet gelockt, niet verlopen) met deze systeemrol in de organisatie, behalve het genoemde. */
    @Query("select count(ar) from AccountRole ar "
            + "where ar.tenantOrganization = :organizationId and ar.role.systemKey = :systemKey "
            + "and ar.account.accountId <> :exceptAccountId and ar.account.locked = false "
            + "and (ar.account.expiresAt is null or ar.account.expiresAt > :now)")
    long countUsableOtherAccountsWithSystemRole(@Param("organizationId") UUID organizationId,
                                                @Param("systemKey") String systemKey,
                                                @Param("exceptAccountId") UUID exceptAccountId,
                                                @Param("now") LocalDateTime now);
}
