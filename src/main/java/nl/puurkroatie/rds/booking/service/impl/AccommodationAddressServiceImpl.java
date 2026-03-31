package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AccommodationAddressDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import nl.puurkroatie.rds.booking.entity.AccommodationAddress;
import nl.puurkroatie.rds.booking.entity.AccommodationAddressId;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.mapper.AccommodationAddressMapper;
import nl.puurkroatie.rds.booking.repository.AccommodationAddressRepository;
import nl.puurkroatie.rds.booking.repository.AccommodationRepository;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.service.AccommodationAddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AccommodationAddressServiceImpl implements AccommodationAddressService {

    private final AccommodationAddressRepository accommodationAddressRepository;
    private final AccommodationRepository accommodationRepository;
    private final AddressRepository addressRepository;
    private final AccommodationAddressMapper accommodationAddressMapper;

    public AccommodationAddressServiceImpl(AccommodationAddressRepository accommodationAddressRepository, AccommodationRepository accommodationRepository, AddressRepository addressRepository, AccommodationAddressMapper accommodationAddressMapper) {
        this.accommodationAddressRepository = accommodationAddressRepository;
        this.accommodationRepository = accommodationRepository;
        this.addressRepository = addressRepository;
        this.accommodationAddressMapper = accommodationAddressMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccommodationAddressDto> findAll() {
        if (isAdmin()) {
            return accommodationAddressRepository.findAll().stream()
                    .map(accommodationAddressMapper::toDto)
                    .toList();
        }
        return accommodationAddressRepository.findByAccommodationTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(accommodationAddressMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccommodationAddressDto> findById(UUID accommodationId, UUID addressId) {
        return accommodationAddressRepository.findById(new AccommodationAddressId(accommodationId, addressId))
                .filter(aa -> isAdmin() || aa.getAccommodation().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(accommodationAddressMapper::toDto);
    }

    @Override
    public AccommodationAddressDto create(AccommodationAddressDto dto) {
        Accommodation accommodation = accommodationRepository.findById(dto.getAccommodationId())
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + dto.getAccommodationId()));
        Address address = addressRepository.findById(dto.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + dto.getAddressId()));

        verifyOrganization(accommodation.getTenantOrganization());
        verifyOrganization(address.getTenantOrganization());

        AccommodationAddress entity = new AccommodationAddress(accommodation, address);
        AccommodationAddress saved = accommodationAddressRepository.save(entity);
        return accommodationAddressMapper.toDto(saved);
    }

    @Override
    public void delete(UUID accommodationId, UUID addressId) {
        AccommodationAddress existing = accommodationAddressRepository.findById(new AccommodationAddressId(accommodationId, addressId))
                .orElseThrow(() -> new RuntimeException("AccommodationAddress not found"));

        verifyOrganization(existing.getAccommodation().getTenantOrganization());
        verifyOrganization(existing.getAddress().getTenantOrganization());

        accommodationAddressRepository.deleteById(new AccommodationAddressId(accommodationId, addressId));
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
