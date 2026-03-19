package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.AccountDto;
import nl.puurkroatie.rds.entity.Account;
import nl.puurkroatie.rds.entity.Organization;
import nl.puurkroatie.rds.entity.Person;
import nl.puurkroatie.rds.repository.AccountRepository;
import nl.puurkroatie.rds.repository.OrganizationRepository;
import nl.puurkroatie.rds.repository.PersonRepository;
import nl.puurkroatie.rds.service.AccountService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final OrganizationRepository organizationRepository;
    private final PersonRepository personRepository;

    public AccountServiceImpl(AccountRepository accountRepository, OrganizationRepository organizationRepository, PersonRepository personRepository) {
        this.accountRepository = accountRepository;
        this.organizationRepository = organizationRepository;
        this.personRepository = personRepository;
    }

    @Override
    public AccountDto create(AccountDto dto) {
        Account entity = toEntity(dto);
        Account saved = accountRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public AccountDto update(UUID id, AccountDto dto) {
        if (!accountRepository.findById(id).isPresent()) {
            throw new RuntimeException("Account not found with id: " + id);
        }
        Account entity = toEntity(id, dto);
        Account saved = accountRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!accountRepository.existsById(id)) {
            throw new RuntimeException("Account not found with id: " + id);
        }
        accountRepository.deleteById(id);
    }

    @Override
    public List<AccountDto> findAll() {
        return accountRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AccountDto> findById(UUID id) {
        return accountRepository.findById(id)
                .map(this::toDto);
    }

    private AccountDto toDto(Account entity) {
        return new AccountDto(
                entity.getAccountId(),
                entity.getUserName(),
                null,
                entity.getOrganization().getOrganizationId(),
                entity.getPerson().getPersoonId(),
                entity.getLocked(),
                entity.getExpiresAt(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy()
        );
    }

    private Account toEntity(AccountDto dto) {
        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + dto.getOrganizationId()));
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
        return new Account(
                dto.getPassword(),
                dto.getUserName(),
                organization,
                person,
                dto.getLocked(),
                dto.getExpiresAt(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }

    private Account toEntity(UUID id, AccountDto dto) {
        Organization organization = organizationRepository.findById(dto.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + dto.getOrganizationId()));
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
        return new Account(
                id,
                dto.getPassword(),
                dto.getUserName(),
                organization,
                person,
                dto.getLocked(),
                dto.getExpiresAt(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }
}
