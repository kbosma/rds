package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.dto.AuthorizationLogDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog;
import nl.puurkroatie.rds.auth.entity.AuthorizationLog.Action;
import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.repository.AuthorizationLogRepository;
import nl.puurkroatie.rds.auth.security.Authorities;
import nl.puurkroatie.rds.auth.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Het rechtenlogboek (docs/voorstel-eigen-rollen.md, §4.9). Schrijven gebeurt in dezelfde transactie als de wijziging
 * zelf; lezen kan alleen voor de eigen organisatie (met PLATFORM_ADMIN voor alle).
 */
@Service
@Transactional
public class AuthorizationLogService {

    private final AuthorizationLogRepository repository;

    public AuthorizationLogService(AuthorizationLogRepository repository) {
        this.repository = repository;
    }

    public void roleEvent(Action action, Role role, String details) {
        repository.save(new AuthorizationLog(role.getTenantOrganization(), action, role.getRoleId(), role.getDescription(),
                null, null, null, details));
    }

    public void authorityEvent(Action action, Role role, String authority, String details) {
        repository.save(new AuthorizationLog(role.getTenantOrganization(), action, role.getRoleId(), role.getDescription(),
                authority, null, null, details));
    }

    public void assignmentEvent(Action action, Role role, Account account) {
        repository.save(new AuthorizationLog(account.getTenantOrganization(), action, role.getRoleId(), role.getDescription(),
                null, account.getAccountId(), account.getUserName(), null));
    }

    @Transactional(readOnly = true)
    public List<AuthorizationLogDto> search(UUID roleId, UUID accountId) {
        UUID organization = TenantContext.hasAuthority(Authorities.PLATFORM_ADMIN) ? null : TenantContext.getOrganizationId();
        return repository.search(organization, roleId, accountId).stream()
                .map(l -> new AuthorizationLogDto(l.getAuthorizationLogId(), l.getTenantOrganization(), l.getAction().name(),
                        l.getRoleId(), l.getRoleName(), l.getAuthority(), l.getAccountId(), l.getAccountUserName(),
                        l.getDetails(), l.getCreatedAt(), l.getCreatedBy()))
                .toList();
    }
}
