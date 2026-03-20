package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.AccountDto;
import nl.puurkroatie.rds.entity.Account;
import nl.puurkroatie.rds.entity.Person;
import nl.puurkroatie.rds.repository.AccountRepository;
import nl.puurkroatie.rds.repository.PersonRepository;
import nl.puurkroatie.rds.security.TenantContext;
import nl.puurkroatie.rds.service.AccountService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final PersonRepository personRepository;

    public AccountServiceImpl(AccountRepository accountRepository, PersonRepository personRepository) {
        this.accountRepository = accountRepository;
        this.personRepository = personRepository;
    }

    @Override
    public AccountDto create(AccountDto dto) {
        if (!isAdmin()) {
            Person person = personRepository.findById(dto.getPersonId())
                    .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
            verifyOrganization(person.getOrganization().getOrganizationId());
        }
        Account entity = toEntity(dto);
        Account saved = accountRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public AccountDto update(UUID id, AccountDto dto) {
        Account existing = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + id));
        if (!isAdmin()) {
            verifyOrganization(existing.getPerson().getOrganization().getOrganizationId());
            Person newPerson = personRepository.findById(dto.getPersonId())
                    .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
            verifyOrganization(newPerson.getOrganization().getOrganizationId());
        }
        Account entity = toEntity(id, dto);
        Account saved = accountRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Account existing = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + id));
        if (!isAdmin()) {
            verifyOrganization(existing.getPerson().getOrganization().getOrganizationId());
        }
        accountRepository.deleteById(id);
    }

    @Override
    public List<AccountDto> findAll() {
        if (isAdmin()) {
            return accountRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return accountRepository.findByPersonOrganizationOrganizationId(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AccountDto> findById(UUID id) {
        return accountRepository.findById(id)
                .filter(account -> isAdmin() || account.getPerson().getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private AccountDto toDto(Account entity) {
        return new AccountDto(
                entity.getAccountId(),
                entity.getUserName(),
                null,
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
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
        return new Account(
                dto.getPassword(),
                dto.getUserName(),
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
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + dto.getPersonId()));
        return new Account(
                id,
                dto.getPassword(),
                dto.getUserName(),
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
