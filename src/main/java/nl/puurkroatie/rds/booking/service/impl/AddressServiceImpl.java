package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.entity.AddressRole;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.repository.AddressRoleRepository;
import nl.puurkroatie.rds.booking.service.AddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final AddressRoleRepository addressRoleRepository;

    public AddressServiceImpl(AddressRepository addressRepository, AddressRoleRepository addressRoleRepository) {
        this.addressRepository = addressRepository;
        this.addressRoleRepository = addressRoleRepository;
    }

    @Override
    public AddressDto create(AddressDto dto) {
        Address entity = toEntity(dto);
        Address saved = addressRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public AddressDto update(UUID id, AddressDto dto) {
        Address existing = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Address entity = toEntity(id, dto);
        Address saved = addressRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Address existing = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        addressRepository.deleteById(id);
    }

    @Override
    public List<AddressDto> findAll() {
        if (isAdmin()) {
            return addressRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return addressRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AddressDto> findById(UUID id) {
        return addressRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(this::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private AddressDto toDto(Address entity) {
        return new AddressDto(
                entity.getAddressId(),
                entity.getStreet(),
                entity.getHousenumber(),
                entity.getHousenumberAddition(),
                entity.getPostalcode(),
                entity.getCity(),
                entity.getCountry(),
                entity.getAddressrole() != null ? entity.getAddressrole().getAddressroleId() : null,
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy(),
                entity.getTenantOrganization()
        );
    }

    private AddressRole resolveAddressRole(UUID addressroleId) {
        if (addressroleId == null) {
            return null;
        }
        return addressRoleRepository.findById(addressroleId)
                .orElseThrow(() -> new RuntimeException("AddressRole not found with id: " + addressroleId));
    }

    private Address toEntity(AddressDto dto) {
        return new Address(
                dto.getStreet(),
                dto.getHousenumber(),
                dto.getHousenumberAddition(),
                dto.getPostalcode(),
                dto.getCity(),
                dto.getCountry(),
                resolveAddressRole(dto.getAddressroleId()),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }

    private Address toEntity(UUID id, AddressDto dto) {
        return new Address(
                id,
                dto.getStreet(),
                dto.getHousenumber(),
                dto.getHousenumberAddition(),
                dto.getPostalcode(),
                dto.getCity(),
                dto.getCountry(),
                resolveAddressRole(dto.getAddressroleId()),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }
}
