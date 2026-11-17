package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.mapper.OrganizationMapper;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.auth.service.OrganizationDeletionGuard;
import nl.puurkroatie.rds.auth.service.SystemRoles;
import nl.puurkroatie.rds.common.ConflictException;
import nl.puurkroatie.rds.common.DeletionBlockedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Verwijderen van een organisatie: de service controleert eerst of ze bestaat en laat dan de
 * {@link OrganizationDeletionGuard} beslissen. Een geblokkeerde verwijdering is een 409 (DeletionBlockedException),
 * nooit een 403: die komt alleen van de method security op de controller (ORGANIZATION_DELETE).
 */
@ExtendWith(MockitoExtension.class)
class OrganizationServiceImplTest {

    private static final UUID ORG_ID = UUID.fromString("a1000000-0000-0000-0000-000000000099");

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMapper organizationMapper;

    @Mock
    private OrganizationDeletionGuard deletionGuard;

    @Mock
    private SystemRoles systemRoles;

    @InjectMocks
    private OrganizationServiceImpl organizationService;

    private static Organization customer() {
        return new Organization(ORG_ID, "Klant BV", null, null, null, null);
    }

    @Test
    void delete_withoutBusinessData_checksGuardThenDeletes() {
        when(organizationRepository.findById(ORG_ID)).thenReturn(Optional.of(customer()));

        organizationService.delete(ORG_ID);

        InOrder order = inOrder(deletionGuard, organizationRepository);
        order.verify(deletionGuard).verifyDeletable(ORG_ID);
        order.verify(organizationRepository).deleteById(ORG_ID);
    }

    @Test
    void delete_withBusinessData_isBlockedAndDeletesNothing() {
        when(organizationRepository.findById(ORG_ID)).thenReturn(Optional.of(customer()));
        doThrow(new DeletionBlockedException("This organization cannot be deleted: it still has data (booking: 1)."))
                .when(deletionGuard).verifyDeletable(ORG_ID);

        assertThrows(DeletionBlockedException.class, () -> organizationService.delete(ORG_ID));

        verify(organizationRepository, never()).deleteById(any());
    }

    @Test
    void delete_unknownOrganization_failsBeforeGuard() {
        when(organizationRepository.findById(ORG_ID)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> organizationService.delete(ORG_ID));

        verifyNoInteractions(deletionGuard);
        verify(organizationRepository, never()).deleteById(any());
    }

    @Test
    void delete_thePlatformOrganization_isRefusedBeforeTheGuard() {
        Organization platform = mock(Organization.class);
        when(platform.isPlatform()).thenReturn(true);
        when(organizationRepository.findById(ORG_ID)).thenReturn(Optional.of(platform));

        assertThrows(ConflictException.class, () -> organizationService.delete(ORG_ID));

        verifyNoInteractions(deletionGuard);
        verify(organizationRepository, never()).deleteById(any());
    }
}
