package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookerAddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerAddress;
import nl.puurkroatie.rds.booking.entity.BookerAddressId;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.service.BookerAddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookerAddressServiceImpl implements BookerAddressService {

    private final BookerAddressRepository bookerAddressRepository;
    private final BookerRepository bookerRepository;
    private final AddressRepository addressRepository;

    public BookerAddressServiceImpl(BookerAddressRepository bookerAddressRepository, BookerRepository bookerRepository, AddressRepository addressRepository) {
        this.bookerAddressRepository = bookerAddressRepository;
        this.bookerRepository = bookerRepository;
        this.addressRepository = addressRepository;
    }

    @Override
    public List<BookerAddressDto> findAll() {
        if (isAdmin()) {
            return bookerAddressRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return bookerAddressRepository.findByBookerTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<BookerAddressDto> findById(UUID bookerId, UUID addressId) {
        return bookerAddressRepository.findById(new BookerAddressId(bookerId, addressId))
                .filter(ba -> isAdmin() || ba.getBooker().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    @Override
    public BookerAddressDto create(BookerAddressDto dto) {
        Booker booker = bookerRepository.findById(dto.getBookerId())
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + dto.getBookerId()));
        Address address = addressRepository.findById(dto.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + dto.getAddressId()));
        verifyOrganization(booker.getTenantOrganization());
        BookerAddress entity = new BookerAddress(booker, address);
        BookerAddress saved = bookerAddressRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID bookerId, UUID addressId) {
        BookerAddress existing = bookerAddressRepository.findById(new BookerAddressId(bookerId, addressId))
                .orElseThrow(() -> new RuntimeException("BookerAddress not found"));
        verifyOrganization(existing.getBooker().getTenantOrganization());
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

    private BookerAddressDto toDto(BookerAddress entity) {
        return new BookerAddressDto(
                entity.getBooker().getBookerId(),
                entity.getAddress().getAddressId()
        );
    }
}
