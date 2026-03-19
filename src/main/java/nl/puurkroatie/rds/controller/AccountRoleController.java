package nl.puurkroatie.rds.controller;

import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.service.AccountRoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public List<AccountRole> findAll() {
        return accountRoleService.findAll();
    }

    @GetMapping("/{accountId}/{roleId}")
    public ResponseEntity<AccountRole> findById(@PathVariable UUID accountId, @PathVariable UUID roleId) {
        return accountRoleService.findById(accountId, roleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AccountRole> create(@RequestBody AccountRole accountRole) {
        AccountRole saved = accountRoleService.save(accountRole);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{accountId}/{roleId}")
    public ResponseEntity<Void> delete(@PathVariable UUID accountId, @PathVariable UUID roleId) {
        accountRoleService.deleteById(accountId, roleId);
        return ResponseEntity.noContent().build();
    }
}
