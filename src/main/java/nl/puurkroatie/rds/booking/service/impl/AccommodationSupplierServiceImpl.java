package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.AccommodationSupplierDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import nl.puurkroatie.rds.booking.entity.AccommodationSupplier;
import nl.puurkroatie.rds.booking.entity.AccommodationSupplierId;
import nl.puurkroatie.rds.booking.entity.Supplier;
import nl.puurkroatie.rds.booking.mapper.AccommodationSupplierMapper;
import nl.puurkroatie.rds.booking.repository.AccommodationRepository;
import nl.puurkroatie.rds.booking.repository.AccommodationSupplierRepository;
import nl.puurkroatie.rds.booking.repository.SupplierRepository;
import nl.puurkroatie.rds.booking.service.AccommodationSupplierService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AccommodationSupplierServiceImpl implements AccommodationSupplierService {

    private final AccommodationSupplierRepository accommodationSupplierRepository;
    private final AccommodationRepository accommodationRepository;
    private final SupplierRepository supplierRepository;
    private final AccommodationSupplierMapper accommodationSupplierMapper;

    public AccommodationSupplierServiceImpl(AccommodationSupplierRepository accommodationSupplierRepository, AccommodationRepository accommodationRepository, SupplierRepository supplierRepository, AccommodationSupplierMapper accommodationSupplierMapper) {
        this.accommodationSupplierRepository = accommodationSupplierRepository;
        this.accommodationRepository = accommodationRepository;
        this.supplierRepository = supplierRepository;
        this.accommodationSupplierMapper = accommodationSupplierMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccommodationSupplierDto> findAll() {
        if (isAdmin()) {
            return accommodationSupplierRepository.findAll().stream()
                    .map(accommodationSupplierMapper::toDto)
                    .toList();
        }
        return accommodationSupplierRepository.findByAccommodationTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(accommodationSupplierMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AccommodationSupplierDto> findById(UUID accommodationId, UUID supplierId) {
        return accommodationSupplierRepository.findById(new AccommodationSupplierId(accommodationId, supplierId))
                .filter(as -> isAdmin() || as.getAccommodation().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(accommodationSupplierMapper::toDto);
    }

    @Override
    public AccommodationSupplierDto create(AccommodationSupplierDto dto) {
        Accommodation accommodation = accommodationRepository.findById(dto.getAccommodationId())
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + dto.getAccommodationId()));
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + dto.getSupplierId()));

        verifyOrganization(accommodation.getTenantOrganization());
        verifyOrganization(supplier.getTenantOrganization());

        AccommodationSupplier entity = new AccommodationSupplier(accommodation, supplier);
        AccommodationSupplier saved = accommodationSupplierRepository.save(entity);
        return accommodationSupplierMapper.toDto(saved);
    }

    @Override
    public void delete(UUID accommodationId, UUID supplierId) {
        AccommodationSupplier existing = accommodationSupplierRepository.findById(new AccommodationSupplierId(accommodationId, supplierId))
                .orElseThrow(() -> new RuntimeException("AccommodationSupplier not found"));

        verifyOrganization(existing.getAccommodation().getTenantOrganization());
        verifyOrganization(existing.getSupplier().getTenantOrganization());

        accommodationSupplierRepository.deleteById(new AccommodationSupplierId(accommodationId, supplierId));
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
