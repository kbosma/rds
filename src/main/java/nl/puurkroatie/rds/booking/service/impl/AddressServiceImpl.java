package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.entity.AddressRole;
import nl.puurkroatie.rds.booking.mapper.AddressMapper;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.service.AddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final AddressMapper addressMapper;

    public AddressServiceImpl(AddressRepository addressRepository, AddressMapper addressMapper) {
        this.addressRepository = addressRepository;
        this.addressMapper = addressMapper;
    }

    @Override
    public AddressDto create(AddressDto dto) {
        Address entity = toEntity(dto);
        Address saved = addressRepository.save(entity);
        return addressMapper.toDto(saved);
    }

    @Override
    public AddressDto update(UUID id, AddressDto dto) {
        Address existing = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Address entity = toEntity(id, dto);
        Address saved = addressRepository.save(entity);
        return addressMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Address existing = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        addressRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddressDto> findAll() {
        if (isAdmin()) {
            return addressRepository.findAll().stream()
                    .map(addressMapper::toDto)
                    .toList();
        }
        return addressRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(addressMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AddressDto> findById(UUID id) {
        return addressRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(addressMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Address toEntity(AddressDto dto) {
        AddressRole addressrole = dto.getAddressrole() != null ? AddressRole.fromValue(dto.getAddressrole()) : null;
        return new Address(
                dto.getStreet(),
                dto.getHousenumber(),
                dto.getHousenumberAddition(),
                dto.getPostalcode(),
                dto.getCity(),
                dto.getCountry(),
                addressrole
        );
    }

    private Address toEntity(UUID id, AddressDto dto) {
        AddressRole addressrole = dto.getAddressrole() != null ? AddressRole.fromValue(dto.getAddressrole()) : null;
        return new Address(
                id,
                dto.getStreet(),
                dto.getHousenumber(),
                dto.getHousenumberAddition(),
                dto.getPostalcode(),
                dto.getCity(),
                dto.getCountry(),
                addressrole
        );
    }
}
