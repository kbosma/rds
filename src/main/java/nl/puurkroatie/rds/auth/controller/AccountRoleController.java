package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.AccountRoleDto;
import nl.puurkroatie.rds.auth.dto.AccountRoleResponseDto;
import nl.puurkroatie.rds.auth.service.AccountRoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/account-roles")
public class AccountRoleController {

    private final AccountRoleService accountRoleService;

    public AccountRoleController(AccountRoleService accountRoleService) {
        this.accountRoleService = accountRoleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNTROLE_READ')")
    public List<AccountRoleResponseDto> findAll() {
        return accountRoleService.findAll();
    }

    @GetMapping("/{accountId}/{roleId}")
    @PreAuthorize("hasAuthority('ACCOUNTROLE_READ')")
    public ResponseEntity<AccountRoleResponseDto> findById(@PathVariable UUID accountId, @PathVariable UUID roleId) {
        return accountRoleService.findById(accountId, roleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCOUNTROLE_CREATE')")
    public ResponseEntity<AccountRoleResponseDto> create(@RequestBody @Valid AccountRoleDto dto) {
        AccountRoleResponseDto saved = accountRoleService.create(dto.getAccountId(), dto.getRoleId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{accountId}/{roleId}")
    @PreAuthorize("hasAuthority('ACCOUNTROLE_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID accountId, @PathVariable UUID roleId) {
        accountRoleService.deleteById(accountId, roleId);
        return ResponseEntity.noContent().build();
    }
}
