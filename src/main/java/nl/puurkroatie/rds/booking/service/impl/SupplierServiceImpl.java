package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.SupplierDto;
import nl.puurkroatie.rds.booking.entity.Supplier;
import nl.puurkroatie.rds.booking.repository.SupplierRepository;
import nl.puurkroatie.rds.booking.service.SupplierService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierServiceImpl(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    public SupplierDto create(SupplierDto dto) {
        Supplier entity = toEntity(dto);
        Supplier saved = supplierRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public SupplierDto update(UUID id, SupplierDto dto) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Supplier entity = toEntity(id, dto);
        Supplier saved = supplierRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        supplierRepository.deleteById(id);
    }

    @Override
    public List<SupplierDto> findAll() {
        if (isAdmin()) {
            return supplierRepository.findAll().stream()
                    .map(this::toDto)
                    .toList();
        }
        return supplierRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<SupplierDto> findById(UUID id) {
        return supplierRepository.findById(id)
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

    private SupplierDto toDto(Supplier entity) {
        return new SupplierDto(
                entity.getSupplierId(),
                entity.getKey(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy(),
                entity.getTenantOrganization()
        );
    }

    private Supplier toEntity(SupplierDto dto) {
        return new Supplier(
                dto.getKey(),
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }

    private Supplier toEntity(UUID id, SupplierDto dto) {
        return new Supplier(
                id,
                dto.getKey(),
                dto.getName(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy(),
                TenantContext.getOrganizationId()
        );
    }
}
