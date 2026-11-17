package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.common.ConflictException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Elke organisatie houdt minstens één bruikbaar account (niet gelockt, niet verlopen) met haar beheerdersrol: MANAGER
 * bij een klant (onboarding maakt er altijd een), ADMIN in het platform. Zo kan een organisatie zichzelf niet
 * buitensluiten (docs/voorstel-eigen-rollen.md, §4.3).
 */
@Component
public class AdministratorGuard {

    private final AccountRoleRepository accountRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final Clock clock;

    public AdministratorGuard(AccountRoleRepository accountRoleRepository, OrganizationRepository organizationRepository, Clock clock) {
        this.accountRoleRepository = accountRoleRepository;
        this.organizationRepository = organizationRepository;
        this.clock = clock;
    }

    /** De systeemrol die een organisatie altijd moet houden. */
    public String administratorKey(UUID organizationId) {
        return organizationRepository.findById(organizationId).map(Organization::isPlatform).orElse(false)
                ? SystemRoles.ADMIN : SystemRoles.MANAGER;
    }

    /**
     * Weigert met 409 als dit account de laatste bruikbare beheerder van de organisatie is. Aanroepen vóór het
     * intrekken van de beheerdersrol, en vóór het verwijderen, locken of laten verlopen van het account.
     */
    public void verifyNotLastAdministrator(UUID accountId, UUID organizationId) {
        String key = administratorKey(organizationId);
        if (!accountRoleRepository.existsByAccountAccountIdAndRoleSystemKey(accountId, key)) {
            return;
        }
        long others = accountRoleRepository.countUsableOtherAccountsWithSystemRole(
                organizationId, key, accountId, LocalDateTime.now(clock));
        if (others == 0) {
            throw new ConflictException("Er moet minstens één " + key + " in de organisatie blijven");
        }
    }
}
