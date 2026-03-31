package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookerAddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerAddress;
import nl.puurkroatie.rds.booking.entity.BookerAddressId;
import nl.puurkroatie.rds.booking.mapper.BookerAddressMapper;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.service.BookerAddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookerAddressServiceImpl implements BookerAddressService {

    private final BookerAddressRepository bookerAddressRepository;
    private final BookerRepository bookerRepository;
    private final AddressRepository addressRepository;
    private final BookerAddressMapper bookerAddressMapper;

    public BookerAddressServiceImpl(BookerAddressRepository bookerAddressRepository, BookerRepository bookerRepository, AddressRepository addressRepository, BookerAddressMapper bookerAddressMapper) {
        this.bookerAddressRepository = bookerAddressRepository;
        this.bookerRepository = bookerRepository;
        this.addressRepository = addressRepository;
        this.bookerAddressMapper = bookerAddressMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookerAddressDto> findAll() {
        if (isAdmin()) {
            return bookerAddressRepository.findAll().stream()
                    .map(bookerAddressMapper::toDto)
                    .toList();
        }
        return bookerAddressRepository.findByBookerTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookerAddressMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookerAddressDto> findById(UUID bookerId, UUID addressId) {
        return bookerAddressRepository.findById(new BookerAddressId(bookerId, addressId))
                .filter(ba -> isAdmin() || ba.getBooker().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookerAddressMapper::toDto);
    }

    @Override
    public BookerAddressDto create(BookerAddressDto dto) {
        Booker booker = bookerRepository.findById(dto.getBookerId())
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + dto.getBookerId()));
        Address address = addressRepository.findById(dto.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + dto.getAddressId()));

        verifyOrganization(booker.getTenantOrganization());
        verifyOrganization(address.getTenantOrganization());

        BookerAddress entity = new BookerAddress(booker, address);
        BookerAddress saved = bookerAddressRepository.save(entity);
        return bookerAddressMapper.toDto(saved);
    }

    @Override
    public void delete(UUID bookerId, UUID addressId) {
        BookerAddress existing = bookerAddressRepository.findById(new BookerAddressId(bookerId, addressId))
                .orElseThrow(() -> new RuntimeException("BookerAddress not found"));

        verifyOrganization(existing.getBooker().getTenantOrganization());
        verifyOrganization(existing.getAddress().getTenantOrganization());

        bookerAddressRepository.deleteById(new BookerAddressId(bookerId, addressId));
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
