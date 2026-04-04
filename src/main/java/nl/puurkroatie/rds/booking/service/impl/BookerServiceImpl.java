package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookerDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.booking.mapper.BookerMapper;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.service.BookerService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookerServiceImpl implements BookerService {

    private final BookerRepository bookerRepository;
    private final BookerMapper bookerMapper;

    public BookerServiceImpl(BookerRepository bookerRepository, BookerMapper bookerMapper) {
        this.bookerRepository = bookerRepository;
        this.bookerMapper = bookerMapper;
    }

    @Override
    public BookerDto create(BookerDto dto) {
        Booker entity = toEntity(dto);
        Booker saved = bookerRepository.save(entity);
        return bookerMapper.toDto(saved);
    }

    @Override
    public BookerDto update(UUID id, BookerDto dto) {
        Booker existing = bookerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Booker entity = toEntity(id, dto, existing);
        Booker saved = bookerRepository.save(entity);
        return bookerMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Booker existing = bookerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        bookerRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookerDto> findAll() {
        if (isAdmin()) {
            return bookerRepository.findAll().stream()
                    .map(bookerMapper::toDto)
                    .toList();
        }
        return bookerRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookerMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookerDto> findById(UUID id) {
        return bookerRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookerMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Booker toEntity(BookerDto dto) {
        Gender gender = dto.getGender() != null ? Gender.fromValue(dto.getGender()) : null;
        return new Booker(
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCallsign(),
                dto.getTelephone(),
                dto.getEmailaddress(),
                gender,
                dto.getBirthdate(),
                dto.getInitials()
        );
    }

    private Booker toEntity(UUID id, BookerDto dto, Booker existing) {
        Gender gender = dto.getGender() != null ? Gender.fromValue(dto.getGender()) : null;
        return new Booker(
                id,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCallsign(),
                dto.getTelephone(),
                dto.getEmailaddress(),
                gender,
                dto.getBirthdate(),
                dto.getInitials(),
                existing.getCreatedAt(),
                existing.getCreatedBy(),
                existing.getTenantOrganization()
        );
    }
}
