package nl.puurkroatie.rds.mollie.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentStatusEntryMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MolliePaymentStatusEntryServiceImpl implements MolliePaymentStatusEntryService {

    private final MolliePaymentStatusEntryRepository statusEntryRepository;
    private final MolliePaymentRepository molliePaymentRepository;
    private final MolliePaymentStatusEntryMapper statusEntryMapper;

    public MolliePaymentStatusEntryServiceImpl(MolliePaymentStatusEntryRepository statusEntryRepository,
                                                MolliePaymentRepository molliePaymentRepository,
                                                MolliePaymentStatusEntryMapper statusEntryMapper) {
        this.statusEntryRepository = statusEntryRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.statusEntryMapper = statusEntryMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MolliePaymentStatusEntryDto> findAll() {
        if (isAdmin()) {
            return statusEntryRepository.findAll().stream()
                    .map(statusEntryMapper::toDto)
                    .toList();
        }
        return statusEntryRepository.findAll().stream()
                .filter(entry -> entry.getMolliePayment().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(statusEntryMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MolliePaymentStatusEntryDto> findByMolliePaymentId(UUID molliePaymentId) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        if (!isAdmin()) {
            verifyOrganization(payment.getTenantOrganization());
        }
        return statusEntryRepository.findByMolliePaymentMolliePaymentId(molliePaymentId).stream()
                .map(statusEntryMapper::toDto)
                .toList();
    }

    @Override
    public MolliePaymentStatusEntryDto create(MolliePaymentStatusEntryDto dto) {
        MolliePayment payment = molliePaymentRepository.findById(dto.getMolliePaymentId())
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + dto.getMolliePaymentId()));

        MolliePaymentStatus status = MolliePaymentStatus.fromValue(dto.getStatus());
        UUID createdBy;

        if (BookerContext.isBooker()) {
            if (status == MolliePaymentStatus.OPEN) {
                throw new AccessDeniedException("Booker may not create status OPEN");
            }
            createdBy = BookerContext.getBookerId();
        } else {
            verifyOrganization(payment.getTenantOrganization());
            if (!isAdmin() && !isManager()) {
                if (status != MolliePaymentStatus.OPEN) {
                    throw new AccessDeniedException("Employee may only create status OPEN");
                }
            }
            createdBy = TenantContext.getAccountId();
        }

        MolliePaymentStatusEntry entity = new MolliePaymentStatusEntry(payment, status, createdBy);
        MolliePaymentStatusEntry saved = statusEntryRepository.save(entity);
        return statusEntryMapper.toDto(saved);
    }

    @Override
    public MolliePaymentStatusEntryDto update(UUID id, MolliePaymentStatusEntryDto dto) {
        if (!isAdmin()) {
            throw new AccessDeniedException("Only ADMIN can update status entries");
        }
        MolliePaymentStatusEntry existing = statusEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MolliePaymentStatusEntry not found with id: " + id));

        MolliePayment payment = molliePaymentRepository.findById(dto.getMolliePaymentId())
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + dto.getMolliePaymentId()));

        MolliePaymentStatus status = MolliePaymentStatus.fromValue(dto.getStatus());
        MolliePaymentStatusEntry updated = new MolliePaymentStatusEntry(id, payment, status, existing.getCreatedBy());
        MolliePaymentStatusEntry saved = statusEntryRepository.save(updated);
        return statusEntryMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!isAdmin()) {
            throw new AccessDeniedException("Only ADMIN can delete status entries");
        }
        statusEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MolliePaymentStatusEntry not found with id: " + id));
        statusEntryRepository.deleteById(id);
    }

    @Override
    public void createInitialStatus(UUID molliePaymentId) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        UUID createdBy = TenantContext.getAccountId();
        MolliePaymentStatusEntry entry = new MolliePaymentStatusEntry(payment, MolliePaymentStatus.OPEN, createdBy);
        statusEntryRepository.save(entry);
    }

    @Override
    public void createStatusFromWebhook(UUID molliePaymentId, MolliePaymentStatus status) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        MolliePaymentStatusEntry entry = new MolliePaymentStatusEntry(payment, status, null);
        statusEntryRepository.save(entry);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private boolean isManager() {
        return TenantContext.hasRole("MANAGER");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
