package nl.puurkroatie.rds.repository;

import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.entity.AccountRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRoleRepository extends JpaRepository<AccountRole, AccountRoleId> {
}
