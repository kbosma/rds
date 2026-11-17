package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.PersonDto;
import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.Person;
import nl.puurkroatie.rds.auth.mapper.PersonMapper;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.repository.PersonRepository;
import nl.puurkroatie.rds.auth.security.Authorities;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.PersonService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class PersonServiceImpl implements PersonService {

    private final PersonRepository personRepository;
    private final OrganizationRepository organizationRepository;
    private final AccountRepository accountRepository;
    private final PersonMapper personMapper;

    public PersonServiceImpl(PersonRepository personRepository, OrganizationRepository organizationRepository, AccountRepository accountRepository, PersonMapper personMapper) {
        this.personRepository = personRepository;
        this.organizationRepository = organizationRepository;
        this.accountRepository = accountRepository;
        this.personMapper = personMapper;
    }

    @Override
    public PersonDto create(PersonDto dto) {
        if (isLimitedToOwnData()) {
            throw new AccessDeniedException("Access denied: employees cannot create persons");
        }
        UUID organizationId;
        if (isAdmin()) {
            if (dto.getTenantOrganization() == null) {
                throw new IllegalArgumentException("organizationId is required for admin");
            }
            organizationId = dto.getTenantOrganization();
        } else {
            organizationId = TenantContext.getOrganizationId();
        }
        Person entity = toEntity(dto, organizationId);
        Person saved = personRepository.save(entity);
        return personMapper.toDto(saved);
    }

    @Override
    public PersonDto update(UUID id, PersonDto dto) {
        Person existing = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + id));
        if (isLimitedToOwnData()) {
            UUID ownPersonId = accountRepository.findById(TenantContext.getAccountId())
                    .map(account -> account.getPerson().getPersoonId())
                    .orElseThrow(() -> new AccessDeniedException("Access denied"));
            if (!ownPersonId.equals(id)) {
                throw new AccessDeniedException("Access denied: employees can only update their own person");
            }
        } else if (!isAdmin()) {
            verifyOrganization(existing.getTenantOrganization().getOrganizationId());
        }
        Person entity = new Person(
                id,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                existing.getTenantOrganization()
        );
        Person saved = personRepository.save(entity);
        return personMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (isLimitedToOwnData()) {
            throw new AccessDeniedException("Access denied: employees cannot delete persons");
        }
        Person existing = personRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + id));
        if (!isAdmin()) {
            verifyOrganization(existing.getTenantOrganization().getOrganizationId());
        }
        personRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PersonDto> findAll() {
        if (isAdmin()) {
            return personRepository.findAll().stream()
                    .map(personMapper::toDto)
                    .toList();
        }
        if (isLimitedToOwnData()) {
            return accountRepository.findById(TenantContext.getAccountId())
                    .map(account -> personMapper.toDto(account.getPerson()))
                    .map(List::of)
                    .orElse(List.of());
        }
        return personRepository.findByTenantOrganizationOrganizationId(TenantContext.getOrganizationId()).stream()
                .map(personMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PersonDto> findById(UUID id) {
        if (isLimitedToOwnData()) {
            return accountRepository.findById(TenantContext.getAccountId())
                    .filter(account -> account.getPerson().getPersoonId().equals(id))
                    .map(account -> personMapper.toDto(account.getPerson()));
        }
        return personRepository.findById(id)
                .filter(person -> isAdmin() || person.getTenantOrganization().getOrganizationId().equals(TenantContext.getOrganizationId()))
                .map(personMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasAuthority(Authorities.PLATFORM_ADMIN);
    }

    private boolean isLimitedToOwnData() {
        return !TenantContext.hasAuthority(Authorities.USER_SCOPE_ORGANIZATION);
    }

    private void verifyOrganization(UUID organizationId) {
        if (!organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Person toEntity(PersonDto dto, UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));
        return new Person(
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                organization
        );
    }

}
