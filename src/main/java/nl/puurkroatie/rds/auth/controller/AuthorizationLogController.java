package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.AuthorizationLogDto;
import nl.puurkroatie.rds.auth.service.AuthorizationLogService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/authorization-log")
public class AuthorizationLogController {

    private final AuthorizationLogService authorizationLogService;

    public AuthorizationLogController(AuthorizationLogService authorizationLogService) {
        this.authorizationLogService = authorizationLogService;
    }

    /** Het rechtenlogboek van de eigen organisatie, nieuwste eerst; optioneel voor één rol of één account. */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public List<AuthorizationLogDto> search(@RequestParam(required = false) UUID roleId,
                                            @RequestParam(required = false) UUID accountId) {
        return authorizationLogService.search(roleId, accountId);
    }
}
