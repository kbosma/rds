package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.Person;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.security.JwtTokenProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Geeft het token van een medewerker uit, met zijn authorities en zijn rechtenversie ({@code authz_version}).
 * Bij inloggen én bij verversen (docs/voorstel-eigen-rollen.md, §6): na een wijziging in zijn rechten weigert de
 * backend het oude token en haalt de frontend hiermee een nieuw op, zonder opnieuw in te loggen.
 */
@Service
public class EmployeeTokenService {

    private final JwtTokenProvider jwtTokenProvider;
    private final AccountRepository accountRepository;
    private final AccountRoleRepository accountRoleRepository;
    private final RoleAuthorityRepository roleAuthorityRepository;
    private final Clock clock;

    public EmployeeTokenService(JwtTokenProvider jwtTokenProvider, AccountRepository accountRepository,
                                AccountRoleRepository accountRoleRepository, RoleAuthorityRepository roleAuthorityRepository,
                                Clock clock) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public String issue(Account account) {
        List<AccountRole> accountRoles = accountRoleRepository.findByAccount(account);
        List<String> authorities = accountRoles.stream()
                .flatMap(ar -> roleAuthorityRepository.findByRole(ar.getRole()).stream())
                .map(RoleAuthority::getAuthority)
                .map(authority -> authority.getDescription())
                .distinct()
                .toList();
        List<String> roles = accountRoles.stream()
                .map(ar -> ar.getRole().getDescription())
                .distinct()
                .toList();

        Person person = account.getPerson();
        return jwtTokenProvider.generateToken(
                account.getAccountId(),
                account.getTenantOrganization(),
                person.getPersoonId(),
                account.getUserName(),
                personName(person),
                person.getTenantOrganization().getName(),
                authorities,
                roles,
                // Uit de database, niet uit de entity: triggers verhogen de versie buiten JPA om (V26).
                accountRepository.findAuthzVersion(account.getAccountId()).orElseThrow());
    }

    /**
     * Een nieuw token voor een ingelogde medewerker, met zijn huidige rechten. Geweigerd (401) als het account inmiddels
     * gelockt of verlopen is of een nieuw wachtwoord moet kiezen: dan moet hij opnieuw inloggen.
     */
    @Transactional(readOnly = true)
    public String refresh(UUID accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new BadCredentialsException("Account bestaat niet meer"));
        boolean expired = account.getExpiresAt() != null && !account.getExpiresAt().isAfter(LocalDateTime.now(clock));
        if (Boolean.TRUE.equals(account.getLocked()) || expired || Boolean.TRUE.equals(account.getMustChangePassword())) {
            throw new BadCredentialsException("Log opnieuw in");
        }
        return issue(account);
    }

    private static String personName(Person person) {
        StringBuilder sb = new StringBuilder();
        if (person.getFirstname() != null) {
            sb.append(person.getFirstname());
        }
        if (person.getPrefix() != null && !person.getPrefix().isEmpty()) {
            sb.append(' ').append(person.getPrefix());
        }
        if (person.getLastname() != null) {
            sb.append(' ').append(person.getLastname());
        }
        return sb.toString().trim();
    }
}
