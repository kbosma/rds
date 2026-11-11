package nl.puurkroatie.rds.bookingstatus.service.impl;

import nl.puurkroatie.rds.auth.event.EmployeeLoggedInEvent;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Wanneer de statusengine draait buiten een betaling om: bij het inloggen van een medewerker (alleen diens
 * organisatie) en elke nacht (alle organisaties). Beide in een eigen transactie, en een fout breekt het inloggen niet.
 */
@Component
public class StatusEngineTriggers {

    private static final Logger log = LoggerFactory.getLogger(StatusEngineTriggers.class);

    private final BookingStatusEngine engine;
    private final TransactionTemplate newTransaction;

    private final boolean onLogin;

    public StatusEngineTriggers(BookingStatusEngine engine, PlatformTransactionManager transactionManager,
                                @Value("${app.status-engine.on-login:true}") boolean onLogin) {
        this.engine = engine;
        this.onLogin = onLogin;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @EventListener
    public void onEmployeeLoggedIn(EmployeeLoggedInEvent event) {
        if (!onLogin || event.organizationId() == null) {
            return;
        }
        try {
            newTransaction.executeWithoutResult(status -> engine.evaluateOrganization(event.organizationId()));
        } catch (RuntimeException e) {
            log.error("Statusengine bij inloggen mislukt voor organisatie {}", event.organizationId(), e);
        }
    }

    @Scheduled(cron = "${app.status-engine.cron:0 15 2 * * *}", zone = "Europe/Amsterdam")
    public void nightly() {
        try {
            newTransaction.executeWithoutResult(status -> engine.evaluateAll());
            log.info("Nachtelijke statusengine klaar");
        } catch (RuntimeException e) {
            log.error("Nachtelijke statusengine mislukt", e);
        }
    }
}
