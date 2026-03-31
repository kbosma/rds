package nl.puurkroatie.rds.auth.mapper;

import nl.puurkroatie.rds.auth.dto.AccountDto;
import nl.puurkroatie.rds.auth.entity.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    @Mapping(source = "person.persoonId", target = "personId")
    @Mapping(target = "password", ignore = true)
    AccountDto toDto(Account entity);
}
