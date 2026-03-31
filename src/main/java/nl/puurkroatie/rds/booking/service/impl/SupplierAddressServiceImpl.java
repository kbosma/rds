package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.SupplierAddressDto;
import nl.puurkroatie.rds.booking.entity.Address;
import nl.puurkroatie.rds.booking.entity.Supplier;
import nl.puurkroatie.rds.booking.entity.SupplierAddress;
import nl.puurkroatie.rds.booking.entity.SupplierAddressId;
import nl.puurkroatie.rds.booking.mapper.SupplierAddressMapper;
import nl.puurkroatie.rds.booking.repository.AddressRepository;
import nl.puurkroatie.rds.booking.repository.SupplierAddressRepository;
import nl.puurkroatie.rds.booking.repository.SupplierRepository;
import nl.puurkroatie.rds.booking.service.SupplierAddressService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SupplierAddressServiceImpl implements SupplierAddressService {

    private final SupplierAddressRepository supplierAddressRepository;
    private final SupplierRepository supplierRepository;
    private final AddressRepository addressRepository;
    private final SupplierAddressMapper supplierAddressMapper;

    public SupplierAddressServiceImpl(SupplierAddressRepository supplierAddressRepository, SupplierRepository supplierRepository, AddressRepository addressRepository, SupplierAddressMapper supplierAddressMapper) {
        this.supplierAddressRepository = supplierAddressRepository;
        this.supplierRepository = supplierRepository;
        this.addressRepository = addressRepository;
        this.supplierAddressMapper = supplierAddressMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierAddressDto> findAll() {
        if (isAdmin()) {
            return supplierAddressRepository.findAll().stream()
                    .map(supplierAddressMapper::toDto)
                    .toList();
        }
        return supplierAddressRepository.findBySupplierTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(supplierAddressMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SupplierAddressDto> findById(UUID supplierId, UUID addressId) {
        return supplierAddressRepository.findById(new SupplierAddressId(supplierId, addressId))
                .filter(sa -> isAdmin() || sa.getSupplier().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(supplierAddressMapper::toDto);
    }

    @Override
    public SupplierAddressDto create(SupplierAddressDto dto) {
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + dto.getSupplierId()));
        Address address = addressRepository.findById(dto.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found with id: " + dto.getAddressId()));

        verifyOrganization(supplier.getTenantOrganization());
        verifyOrganization(address.getTenantOrganization());

        SupplierAddress entity = new SupplierAddress(supplier, address);
        SupplierAddress saved = supplierAddressRepository.save(entity);
        return supplierAddressMapper.toDto(saved);
    }

    @Override
    public void delete(UUID supplierId, UUID addressId) {
        SupplierAddress existing = supplierAddressRepository.findById(new SupplierAddressId(supplierId, addressId))
                .orElseThrow(() -> new RuntimeException("SupplierAddress not found"));

        verifyOrganization(existing.getSupplier().getTenantOrganization());
        verifyOrganization(existing.getAddress().getTenantOrganization());

        supplierAddressRepository.deleteById(new SupplierAddressId(supplierId, addressId));
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
