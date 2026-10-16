package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.AccountRoleResponseDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.Role;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AccountRoleMapper {

    AccountRoleResponseDto toDto(AccountRole entity);

    AccountRoleResponseDto.AccountRef toAccountRef(Account account);

    AccountRoleResponseDto.RoleRef toRoleRef(Role role);
}
