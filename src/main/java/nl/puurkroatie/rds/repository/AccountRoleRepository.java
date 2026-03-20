package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.Account;
import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.entity.AccountRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AccountRoleRepository extends JpaRepository<AccountRole, AccountRoleId> {

    List<AccountRole> findByAccount(Account account);

    List<AccountRole> findByAccountPersonOrganizationOrganizationId(UUID organizationId);
}
