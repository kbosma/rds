package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookerDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.mapper.BookerMapper;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-tests voor de nieuwe status-logica in BookerServiceImpl (Slice 1):
 * de default-status bij create/update en het doorschakelen van findAll naar
 * de juiste repository-methode op basis van status + rol.
 */
@ExtendWith(MockitoExtension.class)
class BookerServiceImplTest {

    private static final UUID ORG_ID = UUID.fromString("a1000000-0000-0000-0000-000000000001");

    @Mock
    private BookerRepository bookerRepository;

    @Mock
    private BookerMapper bookerMapper;

    @Mock
    private nl.puurkroatie.rds.booking.service.DeletionGuard deletionGuard;

    @Mock
    private nl.puurkroatie.rds.booking.service.AddressCleanup addressCleanup;

    @InjectMocks
    private BookerServiceImpl service;

    @Captor
    private ArgumentCaptor<Booker> bookerCaptor;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private BookerDto dtoWithStatus(String status) {
        return new BookerDto(null, "Jan", null, "Jansen", null, null,
                "jan@example.com", null, null, null, status, null, null, null, null, null);
    }

    // ---- create: default-status ----

    @Test
    void create_withoutStatus_defaultsToActive() {
        when(bookerRepository.save(any(Booker.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookerMapper.toDto(any(Booker.class))).thenReturn(dtoWithStatus("active"));

        service.create(dtoWithStatus(null));

        verify(bookerRepository).save(bookerCaptor.capture());
        assertEquals(BookerStatus.ACTIVE, bookerCaptor.getValue().getStatus());
    }

    @Test
    void create_withProspectStatus_persistsProspect() {
        when(bookerRepository.save(any(Booker.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookerMapper.toDto(any(Booker.class))).thenReturn(dtoWithStatus("prospect"));

        service.create(dtoWithStatus("prospect"));

        verify(bookerRepository).save(bookerCaptor.capture());
        assertEquals(BookerStatus.PROSPECT, bookerCaptor.getValue().getStatus());
    }

    // ---- update: behoudt bestaande status wanneer niet meegestuurd ----

    @Test
    void update_withoutStatus_keepsExistingStatus() {
        TenantContext.setOrganizationId(ORG_ID);
        TenantContext.setRoles(Set.of("EMPLOYEE"));
        UUID id = UUID.randomUUID();
        Booker existing = new Booker(id, "Jan", null, "Jansen", null, null,
                "jan@example.com", null, null, null, BookerStatus.PROSPECT, null, null, ORG_ID);
        when(bookerRepository.findById(id)).thenReturn(java.util.Optional.of(existing));
        when(bookerRepository.save(any(Booker.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookerMapper.toDto(any(Booker.class))).thenReturn(dtoWithStatus("prospect"));

        service.update(id, dtoWithStatus(null));

        verify(bookerRepository).save(bookerCaptor.capture());
        assertEquals(BookerStatus.PROSPECT, bookerCaptor.getValue().getStatus());
    }

    // ---- findAll: doorschakelen naar de juiste repository-methode ----

    @Test
    void findAll_nonAdminWithStatus_usesTenantAndStatusQuery() {
        TenantContext.setOrganizationId(ORG_ID);
        TenantContext.setRoles(Set.of("EMPLOYEE"));
        when(bookerRepository.findByTenantOrganizationAndStatus(ORG_ID, BookerStatus.PROSPECT))
                .thenReturn(List.of());

        service.findAll(BookerStatus.PROSPECT);

        verify(bookerRepository).findByTenantOrganizationAndStatus(ORG_ID, BookerStatus.PROSPECT);
    }

    @Test
    void findAll_nonAdminWithoutStatus_usesTenantQuery() {
        TenantContext.setOrganizationId(ORG_ID);
        TenantContext.setRoles(Set.of("EMPLOYEE"));
        when(bookerRepository.findByTenantOrganization(ORG_ID)).thenReturn(List.of());

        service.findAll(null);

        verify(bookerRepository).findByTenantOrganization(ORG_ID);
    }

    @Test
    void findAll_adminWithStatus_usesGlobalStatusQuery() {
        TenantContext.setRoles(Set.of("ADMIN"));
        when(bookerRepository.findByStatus(BookerStatus.PROSPECT)).thenReturn(List.of());

        service.findAll(BookerStatus.PROSPECT);

        verify(bookerRepository).findByStatus(BookerStatus.PROSPECT);
    }
}
