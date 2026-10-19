package nl.puurkroatie.rds.mollie.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import nl.puurkroatie.rds.mollie.mapper.MolliePaymentStatusEntryMapper;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import nl.puurkroatie.rds.mollie.service.CreatedByNameResolver;
import nl.puurkroatie.rds.mollie.service.MolliePaymentStatusEntryService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class MolliePaymentStatusEntryServiceImpl implements MolliePaymentStatusEntryService {

    private final MolliePaymentStatusEntryRepository statusEntryRepository;
    private final MolliePaymentRepository molliePaymentRepository;
    private final MolliePaymentStatusEntryMapper statusEntryMapper;
    private final CreatedByNameResolver createdByNameResolver;

    public MolliePaymentStatusEntryServiceImpl(MolliePaymentStatusEntryRepository statusEntryRepository,
                                                MolliePaymentRepository molliePaymentRepository,
                                                MolliePaymentStatusEntryMapper statusEntryMapper,
                                                CreatedByNameResolver createdByNameResolver) {
        this.statusEntryRepository = statusEntryRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.statusEntryMapper = statusEntryMapper;
        this.createdByNameResolver = createdByNameResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MolliePaymentStatusEntryDto> findAll() {
        List<MolliePaymentStatusEntryDto> entries = isAdmin()
                ? statusEntryRepository.findAll().stream().map(statusEntryMapper::toDto).toList()
                : statusEntryRepository.findAll().stream()
                        .filter(entry -> entry.getMolliePayment().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                        .map(statusEntryMapper::toDto)
                        .toList();
        return withCreatedByNames(entries);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MolliePaymentStatusEntryDto> findByMolliePaymentId(UUID molliePaymentId) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        if (!isAdmin()) {
            verifyOrganization(payment.getTenantOrganization());
        }
        return withCreatedByNames(statusEntryRepository.findByMolliePaymentMolliePaymentId(molliePaymentId).stream()
                .map(statusEntryMapper::toDto)
                .toList());
    }

    /** Voegt aan elke regel de leesbare naam van degene die hem aanmaakte toe (in één keer opgezocht). */
    private List<MolliePaymentStatusEntryDto> withCreatedByNames(List<MolliePaymentStatusEntryDto> entries) {
        Map<UUID, String> names = createdByNameResolver.resolve(
                entries.stream().map(MolliePaymentStatusEntryDto::getCreatedBy).toList());
        return entries.stream()
                .map(entry -> entry.withCreatedByName(names.get(entry.getCreatedBy())))
                .toList();
    }

    /** Statussen die een medewerker met de hand mag registreren; PENDING, AUTHORIZED en EXPIRED bepaalt alleen Mollie. */
    static final Set<MolliePaymentStatus> CORRECTION_STATUSES = EnumSet.of(
            MolliePaymentStatus.OPEN, MolliePaymentStatus.PAID, MolliePaymentStatus.FAILED, MolliePaymentStatus.CANCELED);

    @Override
    public MolliePaymentStatusEntryDto createCorrection(UUID molliePaymentId, String statusValue, String reason) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        verifyOrganization(payment.getTenantOrganization());

        MolliePaymentStatus status = MolliePaymentStatus.fromValue(statusValue);
        if (!CORRECTION_STATUSES.contains(status)) {
            throw new IllegalArgumentException("A correction may only set one of the statuses: "
                    + CORRECTION_STATUSES.stream().map(MolliePaymentStatus::toValue).sorted().toList());
        }
        statusEntryRepository.findByMolliePaymentMolliePaymentId(molliePaymentId).stream()
                .max(Comparator.comparing(MolliePaymentStatusEntry::getCreatedAt))
                .filter(latest -> latest.getStatus() == status)
                .ifPresent(latest -> {
                    throw new IllegalArgumentException("The payment already has the status " + status.toValue());
                });

        MolliePaymentStatusEntry saved = statusEntryRepository.save(MolliePaymentStatusEntry.correction(
                payment, status, TenantContext.getAccountId(), reason.trim()));
        return withCreatedByNames(List.of(statusEntryMapper.toDto(saved))).get(0);
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

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
