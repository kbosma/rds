package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.AccountDto;
import nl.puurkroatie.rds.auth.dto.ChangePasswordDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.Person;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.PersonRepository;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AccountService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final PersonRepository personRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountServiceImpl(AccountRepository accountRepository, PersonRepository personRepository, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.personRepository = personRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AccountDto create(AccountDto dto) {
        if (isEmployee()) {
            throw new AccessDeniedException("Access denied: employees cannot create accounts");
        }
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
        if (isEmployee()) {
            throw new AccessDeniedException("Access denied: employees cannot update accounts");
        }
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
        if (isEmployee()) {
            throw new AccessDeniedException("Access denied: employees cannot delete accounts");
        }
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
        if (isEmployee()) {
            return accountRepository.findById(TenantContext.getAccountId())
                    .map(this::toDto)
                    .map(List::of)
                    .orElse(List.of());
        }
        return accountRepository.findByPersonOrganizationOrganizationId(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AccountDto> findById(UUID id) {
        if (isEmployee()) {
            if (!id.equals(TenantContext.getAccountId())) {
                return Optional.empty();
            }
        }
        return accountRepository.findById(id)
                .filter(account -> isAdmin() || account.getPerson().getOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    @Override
    public void changePassword(UUID accountId, ChangePasswordDto dto) {
        Account existing = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found with id: " + accountId));

        if (!passwordEncoder.matches(dto.getCurrentPassword(), existing.getPasswordHash())) {
            throw new AccessDeniedException("Current password is incorrect");
        }

        String encodedPassword = passwordEncoder.encode(dto.getNewPassword());
        accountRepository.updatePassword(accountId, encodedPassword);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private boolean isEmployee() {
        return TenantContext.hasRole("EMPLOYEE") && !TenantContext.hasRole("MANAGER") && !TenantContext.hasRole("ADMIN");
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
                entity.getMustChangePassword(),
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
                dto.getMustChangePassword(),
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
                dto.getMustChangePassword(),
                dto.getExpiresAt(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }
}
