package nl.puurkroatie.rds.bookingstatus.service;

import nl.puurkroatie.rds.auth.event.EmployeeLoggedInEvent;
import nl.puurkroatie.rds.bookingstatus.service.impl.StatusEngineTriggers;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** De statusengine draait bij inloggen (eigen organisatie) en elke nacht (alles); een fout breekt het inloggen niet. */
class StatusEngineTriggersTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000002");

    private static PlatformTransactionManager transactions() {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return manager;
    }

    @Test
    void atLogin_evaluatesTheOwnOrganization() {
        BookingStatusEngine engine = mock(BookingStatusEngine.class);

        new StatusEngineTriggers(engine, transactions(), true).onEmployeeLoggedIn(new EmployeeLoggedInEvent(UUID.randomUUID(), ORG));

        verify(engine).evaluateOrganization(ORG);
    }

    @Test
    void atLogin_switchedOff_doesNothing() {
        BookingStatusEngine engine = mock(BookingStatusEngine.class);

        new StatusEngineTriggers(engine, transactions(), false).onEmployeeLoggedIn(new EmployeeLoggedInEvent(UUID.randomUUID(), ORG));

        verify(engine, never()).evaluateOrganization(any());
    }

    @Test
    void aFailingEngine_doesNotBreakTheLogin() {
        BookingStatusEngine engine = mock(BookingStatusEngine.class);
        doThrow(new IllegalStateException("kapot")).when(engine).evaluateOrganization(ORG);

        new StatusEngineTriggers(engine, transactions(), true).onEmployeeLoggedIn(new EmployeeLoggedInEvent(UUID.randomUUID(), ORG));
    }

    @Test
    void nightly_evaluatesEverything() {
        BookingStatusEngine engine = mock(BookingStatusEngine.class);

        new StatusEngineTriggers(engine, transactions(), true).nightly();

        verify(engine).evaluateAll();
    }
}
