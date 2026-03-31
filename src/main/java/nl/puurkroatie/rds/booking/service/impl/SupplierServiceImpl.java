package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.SupplierDto;
import nl.puurkroatie.rds.booking.entity.Supplier;
import nl.puurkroatie.rds.booking.mapper.SupplierMapper;
import nl.puurkroatie.rds.booking.repository.SupplierRepository;
import nl.puurkroatie.rds.booking.service.SupplierService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    public SupplierServiceImpl(SupplierRepository supplierRepository, SupplierMapper supplierMapper) {
        this.supplierRepository = supplierRepository;
        this.supplierMapper = supplierMapper;
    }

    @Override
    public SupplierDto create(SupplierDto dto) {
        Supplier entity = new Supplier(
                dto.getKey(),
                dto.getName()
        );
        Supplier saved = supplierRepository.save(entity);
        return supplierMapper.toDto(saved);
    }

    @Override
    public SupplierDto update(UUID id, SupplierDto dto) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Supplier entity = supplierMapper.toEntity(id, dto);
        Supplier saved = supplierRepository.save(entity);
        return supplierMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        supplierRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierDto> findAll() {
        if (isAdmin()) {
            return supplierRepository.findAll().stream()
                    .map(supplierMapper::toDto)
                    .toList();
        }
        return supplierRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(supplierMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SupplierDto> findById(UUID id) {
        return supplierRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(supplierMapper::toDto);
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
