package nl.puurkroatie.rds.auth.repository;

import nl.puurkroatie.rds.auth.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByUserName(String userName);

    List<Account> findByPersonOrganizationOrganizationId(UUID organizationId);

    @Modifying
    @Query("UPDATE Account a SET a.passwordHash = :passwordHash, a.mustChangePassword = false WHERE a.accountId = :accountId")
    void updatePassword(UUID accountId, String passwordHash);
}
